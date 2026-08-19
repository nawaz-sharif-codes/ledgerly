import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import {
  DataSource,
  QueryFailedError,
  type EntityManager,
  type Repository,
} from 'typeorm';
import { parseMoney, serializeMoney } from '../common/money/money';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { LedgerEntryEntity } from '../ledger/entities/ledger-entry.entity';
import { TransactionEntity } from '../ledger/entities/transaction.entity';
import { LedgerService } from '../ledger/ledger.service';
import type { CreateWalletDto } from './dto/create-wallet.dto';
import type { DepositDto } from './dto/deposit.dto';
import type { TransactionHistoryQueryDto } from './dto/transaction-history-query.dto';
import { WalletEntity } from './entities/wallet.entity';

interface HistoryCursor {
  createdAt: string;
  id: string;
}

interface RawHistoryRow {
  entry_id: string;
  transaction_id: string;
  transaction_type: 'deposit' | 'transfer';
  transaction_status: 'completed';
  amount: string;
  balance_after: string;
  created_at: Date;
}

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(WalletEntity)
    private readonly walletsRepository: Repository<WalletEntity>,
    private readonly dataSource: DataSource,
    private readonly ledgerService: LedgerService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async create(input: CreateWalletDto) {
    const wallet = this.walletsRepository.create({
      userId: input.userId,
      walletType: 'customer',
      currency: input.currency,
      balanceAfter: new Decimal(0),
    });

    try {
      return this.serializeWallet(await this.walletsRepository.save(wallet));
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException({
          code: 'WALLET_ALREADY_EXISTS',
          message: 'This user already has a wallet in the selected currency.',
        });
      }

      throw error;
    }
  }

  async list(userId: string) {
    const wallets = await this.walletsRepository.find({
      where: { userId, walletType: 'customer' },
      order: { currency: 'ASC' },
    });

    return { items: wallets.map((wallet) => this.serializeWallet(wallet)) };
  }

  async get(id: string) {
    return this.serializeWallet(await this.findCustomerWallet(id));
  }

  async deposit(
    walletId: string,
    input: DepositDto,
    idempotencyKey: string | undefined,
  ) {
    const amount = parseMoney(input.amount);

    return this.idempotencyService.execute(
      idempotencyKey,
      { operation: 'deposit', walletId, amount: serializeMoney(amount) },
      async (manager) => {
        const wallet = await this.findCustomerWallet(walletId, manager, true);
        const clearingWallet = await manager
          .getRepository(WalletEntity)
          .findOne({
            where: { walletType: 'clearing', currency: wallet.currency },
            lock: { mode: 'pessimistic_write' },
          });

        if (!clearingWallet) {
          throw new Error(`Missing ${wallet.currency} clearing wallet.`);
        }

        const transactionRepository = manager.getRepository(TransactionEntity);
        const transaction = await transactionRepository.save(
          transactionRepository.create({
            type: 'deposit',
            status: 'pending',
            idempotencyKey: idempotencyKey ?? null,
          }),
        );
        const entries = await this.ledgerService.postBalancedEntries(
          manager,
          transaction,
          [
            { wallet: clearingWallet, amount: amount.negated() },
            { wallet, amount },
          ],
        );

        await transactionRepository.update(
          { id: transaction.id },
          { status: 'completed' },
        );

        return {
          transaction: {
            id: transaction.id,
            type: 'deposit',
            status: 'completed',
            amount: serializeMoney(amount),
            currency: wallet.currency,
            createdAt: transaction.createdAt.toISOString(),
          },
          wallet: this.serializeWallet(wallet),
          ledger: entries,
        };
      },
    );
  }

  async history(walletId: string, query: TransactionHistoryQueryDto) {
    await this.findCustomerWallet(walletId);
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : undefined;
    const limit = query.limit;
    const builder = this.dataSource
      .getRepository(LedgerEntryEntity)
      .createQueryBuilder('entry')
      .innerJoin(
        TransactionEntity,
        'transaction',
        'transaction.id = entry.transaction_id',
      )
      .select('entry.id', 'entry_id')
      .addSelect('entry.transaction_id', 'transaction_id')
      .addSelect('transaction.type', 'transaction_type')
      .addSelect('transaction.status', 'transaction_status')
      .addSelect('entry.amount', 'amount')
      .addSelect('entry.balance_after', 'balance_after')
      .addSelect('entry.created_at', 'created_at')
      .where('entry.wallet_id = :walletId', { walletId })
      .orderBy('entry.created_at', 'DESC')
      .addOrderBy('entry.id', 'DESC')
      .take(limit + 1);

    if (cursor) {
      builder.andWhere(
        '(entry.created_at, entry.id) < (:cursorCreatedAt, :cursorId)',
        {
          cursorCreatedAt: cursor.createdAt,
          cursorId: cursor.id,
        },
      );
    }

    const rows = await builder.getRawMany<RawHistoryRow>();
    const hasNextPage = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    const lastRow = pageRows.at(-1);

    return {
      items: pageRows.map((row) => ({
        id: row.entry_id,
        transactionId: row.transaction_id,
        type: row.transaction_type,
        status: row.transaction_status,
        direction: new Decimal(row.amount).isNegative() ? 'debit' : 'credit',
        amount: serializeMoney(row.amount),
        balanceAfter: serializeMoney(row.balance_after),
        createdAt: new Date(row.created_at).toISOString(),
      })),
      nextCursor:
        hasNextPage && lastRow
          ? this.encodeCursor({
              createdAt: new Date(lastRow.created_at).toISOString(),
              id: lastRow.entry_id,
            })
          : null,
    };
  }

  private async findCustomerWallet(
    id: string,
    manager?: EntityManager,
    lock = false,
  ): Promise<WalletEntity> {
    const repository = manager
      ? manager.getRepository(WalletEntity)
      : this.walletsRepository;
    const wallet = await repository.findOne({
      where: { id, walletType: 'customer' },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });

    if (!wallet) {
      throw new NotFoundException({
        code: 'WALLET_NOT_FOUND',
        message: 'Wallet not found.',
      });
    }

    return wallet;
  }

  private serializeWallet(wallet: WalletEntity) {
    return {
      id: wallet.id,
      userId: wallet.userId,
      currency: wallet.currency,
      balance: serializeMoney(wallet.balanceAfter),
      createdAt: wallet.createdAt.toISOString(),
    };
  }

  private encodeCursor(cursor: HistoryCursor): string {
    return Buffer.from(JSON.stringify(cursor)).toString('base64url');
  }

  private decodeCursor(cursor: string): HistoryCursor {
    try {
      const value = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as Partial<HistoryCursor>;

      if (
        typeof value.createdAt !== 'string' ||
        Number.isNaN(Date.parse(value.createdAt)) ||
        typeof value.id !== 'string'
      ) {
        throw new Error('Invalid cursor shape.');
      }

      return { createdAt: value.createdAt, id: value.id };
    } catch {
      throw new BadRequestException({
        code: 'INVALID_CURSOR',
        message: 'Transaction cursor is invalid.',
      });
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === '23505'
    );
  }
}

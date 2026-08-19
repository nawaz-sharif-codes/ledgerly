import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { parseMoney, serializeMoney } from '../common/money/money';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { TransactionEntity } from '../ledger/entities/transaction.entity';
import { LedgerService } from '../ledger/ledger.service';
import { WalletEntity } from '../wallets/entities/wallet.entity';
import type { CreateTransferDto } from './dto/create-transfer.dto';

@Injectable()
export class TransfersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ledgerService: LedgerService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async create(input: CreateTransferDto, idempotencyKey: string | undefined) {
    if (input.fromWalletId === input.toWalletId) {
      throw new UnprocessableEntityException({
        code: 'SELF_TRANSFER_NOT_ALLOWED',
        message: 'Source and destination wallets must be different.',
      });
    }

    const amount = parseMoney(input.amount);

    return this.idempotencyService.execute(
      idempotencyKey,
      {
        operation: 'transfer',
        fromWalletId: input.fromWalletId,
        toWalletId: input.toWalletId,
        amount: serializeMoney(amount),
      },
      async (manager) => {
        const walletIds = [input.fromWalletId, input.toWalletId].sort();
        const lockedWallets = await manager
          .getRepository(WalletEntity)
          .createQueryBuilder('wallet')
          .setLock('pessimistic_write')
          .where('wallet.id IN (:...walletIds)', { walletIds })
          .andWhere('wallet.wallet_type = :walletType', {
            walletType: 'customer',
          })
          .orderBy('wallet.id', 'ASC')
          .getMany();

        if (lockedWallets.length !== 2) {
          throw new NotFoundException({
            code: 'WALLET_NOT_FOUND',
            message: 'Source or destination wallet was not found.',
          });
        }

        const fromWallet = lockedWallets.find(
          (wallet) => wallet.id === input.fromWalletId,
        );
        const toWallet = lockedWallets.find(
          (wallet) => wallet.id === input.toWalletId,
        );

        if (!fromWallet || !toWallet) {
          throw new NotFoundException({
            code: 'WALLET_NOT_FOUND',
            message: 'Source or destination wallet was not found.',
          });
        }

        if (fromWallet.currency !== toWallet.currency) {
          throw new UnprocessableEntityException({
            code: 'CURRENCY_MISMATCH',
            message: 'Transfers require wallets with the same currency.',
          });
        }

        const transactionRepository = manager.getRepository(TransactionEntity);
        const transaction = await transactionRepository.save(
          transactionRepository.create({
            type: 'transfer',
            status: 'pending',
            idempotencyKey: idempotencyKey ?? null,
          }),
        );
        const entries = await this.ledgerService.postBalancedEntries(
          manager,
          transaction,
          [
            { wallet: fromWallet, amount: amount.negated() },
            { wallet: toWallet, amount },
          ],
        );

        await transactionRepository.update(
          { id: transaction.id },
          { status: 'completed' },
        );

        return {
          transaction: {
            id: transaction.id,
            type: 'transfer',
            status: 'completed',
            amount: serializeMoney(amount),
            currency: fromWallet.currency,
            fromWalletId: fromWallet.id,
            toWalletId: toWallet.id,
            createdAt: transaction.createdAt.toISOString(),
          },
          wallets: {
            from: {
              id: fromWallet.id,
              balance: serializeMoney(fromWallet.balanceAfter),
            },
            to: {
              id: toWallet.id,
              balance: serializeMoney(toWallet.balanceAfter),
            },
          },
          ledger: entries,
        };
      },
    );
  }
}

import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import Decimal from 'decimal.js';
import type { EntityManager } from 'typeorm';
import { serializeMoney } from '../common/money/money';
import { WalletEntity } from '../wallets/entities/wallet.entity';
import { LedgerEntryEntity } from './entities/ledger-entry.entity';
import type { TransactionEntity } from './entities/transaction.entity';

export interface LedgerMovement {
  wallet: WalletEntity;
  amount: Decimal;
}

export interface PostedLedgerEntry {
  walletId: string;
  amount: string;
  balanceAfter: string;
}

@Injectable()
export class LedgerService {
  async postBalancedEntries(
    manager: EntityManager,
    transaction: TransactionEntity,
    movements: LedgerMovement[],
  ): Promise<PostedLedgerEntry[]> {
    const total = movements.reduce(
      (sum, movement) => sum.plus(movement.amount),
      new Decimal(0),
    );

    if (!total.isZero() || movements.length < 2) {
      throw new Error('Ledger movements must contain balanced entries.');
    }

    const posted: PostedLedgerEntry[] = [];

    for (const movement of movements) {
      const nextBalance = movement.wallet.balanceAfter.plus(movement.amount);

      if (
        movement.wallet.walletType === 'customer' &&
        nextBalance.isNegative()
      ) {
        throw new UnprocessableEntityException({
          code: 'INSUFFICIENT_FUNDS',
          message: 'The source wallet has insufficient funds.',
        });
      }

      const entry = manager.getRepository(LedgerEntryEntity).create({
        walletId: movement.wallet.id,
        transactionId: transaction.id,
        entryType: movement.amount.isNegative() ? 'debit' : 'credit',
        amount: movement.amount,
        balanceAfter: nextBalance,
      });

      await manager.getRepository(LedgerEntryEntity).insert(entry);
      await manager
        .getRepository(WalletEntity)
        .update({ id: movement.wallet.id }, { balanceAfter: nextBalance });

      movement.wallet.balanceAfter = nextBalance;
      posted.push({
        walletId: movement.wallet.id,
        amount: serializeMoney(movement.amount),
        balanceAfter: serializeMoney(nextBalance),
      });
    }

    return posted;
  }
}

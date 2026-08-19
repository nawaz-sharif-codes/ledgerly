import Decimal from 'decimal.js';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalTransformer } from '../../common/money/decimal.transformer';

export type LedgerEntryType = 'debit' | 'credit';

@Entity({ name: 'ledger_entries' })
export class LedgerEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId!: string;

  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId!: string;

  @Column({ name: 'entry_type', type: 'varchar', length: 10 })
  entryType!: LedgerEntryType;

  @Column({
    type: 'numeric',
    precision: 19,
    scale: 4,
    transformer: decimalTransformer,
  })
  amount!: Decimal;

  @Column({
    name: 'balance_after',
    type: 'numeric',
    precision: 19,
    scale: 4,
    transformer: decimalTransformer,
  })
  balanceAfter!: Decimal;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

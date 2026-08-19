import Decimal from 'decimal.js';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalTransformer } from '../../common/money/decimal.transformer';

export const SUPPORTED_CURRENCIES = ['INR', 'USD'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];
export type WalletType = 'customer' | 'clearing';

@Entity({ name: 'wallets' })
export class WalletEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ name: 'wallet_type', type: 'varchar', length: 20 })
  walletType!: WalletType;

  @Column({ type: 'varchar', length: 3 })
  currency!: Currency;

  @Column({
    name: 'balance_after',
    type: 'numeric',
    precision: 19,
    scale: 4,
    default: '0',
    transformer: decimalTransformer,
  })
  balanceAfter!: Decimal;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

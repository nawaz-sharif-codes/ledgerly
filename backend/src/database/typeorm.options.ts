import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';
import type { Environment } from '../config/environment';
import { IdempotencyKeyEntity } from '../idempotency/entities/idempotency-key.entity';
import { LedgerEntryEntity } from '../ledger/entities/ledger-entry.entity';
import { TransactionEntity } from '../ledger/entities/transaction.entity';
import { WalletEntity } from '../wallets/entities/wallet.entity';
import { InitialLedgerSchema1787145600000 } from './migrations/1787145600000-initial-ledger-schema';

export const databaseEntities = [
  WalletEntity,
  TransactionEntity,
  LedgerEntryEntity,
  IdempotencyKeyEntity,
];

export function createTypeOrmOptions(
  environment: Pick<Environment, 'DATABASE_URL' | 'DATABASE_SSL'>,
): TypeOrmModuleOptions & DataSourceOptions {
  return {
    type: 'postgres',
    url: environment.DATABASE_URL,
    ssl: environment.DATABASE_SSL ? { rejectUnauthorized: false } : false,
    synchronize: false,
    logging: false,
    entities: databaseEntities,
    migrations: [InitialLedgerSchema1787145600000],
  };
}

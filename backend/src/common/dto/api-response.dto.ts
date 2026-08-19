import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({ example: 422 })
  statusCode!: number;

  @ApiProperty({ example: 'INSUFFICIENT_FUNDS' })
  code!: string;

  @ApiProperty({ example: 'The source wallet has insufficient funds.' })
  message!: string;

  @ApiProperty({ example: 'req-01k3...' })
  requestId!: string;

  @ApiPropertyOptional()
  details?: unknown;
}

export class WalletResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ enum: ['INR', 'USD'] })
  currency!: 'INR' | 'USD';

  @ApiProperty({ example: '1000.0000', type: String })
  balance!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class WalletCollectionResponseDto {
  @ApiProperty({ type: [WalletResponseDto] })
  items!: WalletResponseDto[];
}

export class LedgerEntryResponseDto {
  @ApiProperty({ format: 'uuid' })
  walletId!: string;

  @ApiProperty({ example: '-250.0000', type: String })
  amount!: string;

  @ApiProperty({ example: '750.0000', type: String })
  balanceAfter!: string;
}

export class TransactionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['deposit', 'transfer'] })
  type!: 'deposit' | 'transfer';

  @ApiProperty({ enum: ['completed'] })
  status!: 'completed';

  @ApiProperty({ example: '250.0000', type: String })
  amount!: string;

  @ApiProperty({ enum: ['INR', 'USD'] })
  currency!: 'INR' | 'USD';

  @ApiPropertyOptional({ format: 'uuid' })
  fromWalletId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  toWalletId?: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class DepositResponseDto {
  @ApiProperty({ type: TransactionResponseDto })
  transaction!: TransactionResponseDto;

  @ApiProperty({ type: WalletResponseDto })
  wallet!: WalletResponseDto;

  @ApiProperty({ type: [LedgerEntryResponseDto] })
  ledger!: LedgerEntryResponseDto[];
}

export class WalletBalanceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '750.0000', type: String })
  balance!: string;
}

export class TransferWalletsResponseDto {
  @ApiProperty({ type: WalletBalanceResponseDto })
  from!: WalletBalanceResponseDto;

  @ApiProperty({ type: WalletBalanceResponseDto })
  to!: WalletBalanceResponseDto;
}

export class TransferResponseDto {
  @ApiProperty({ type: TransactionResponseDto })
  transaction!: TransactionResponseDto;

  @ApiProperty({ type: TransferWalletsResponseDto })
  wallets!: TransferWalletsResponseDto;

  @ApiProperty({ type: [LedgerEntryResponseDto] })
  ledger!: LedgerEntryResponseDto[];
}

export class TransactionHistoryItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  transactionId!: string;

  @ApiProperty({ enum: ['deposit', 'transfer'] })
  type!: 'deposit' | 'transfer';

  @ApiProperty({ enum: ['completed'] })
  status!: 'completed';

  @ApiProperty({ enum: ['debit', 'credit'] })
  direction!: 'debit' | 'credit';

  @ApiProperty({ example: '-250.0000', type: String })
  amount!: string;

  @ApiProperty({ example: '750.0000', type: String })
  balanceAfter!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class TransactionHistoryPageResponseDto {
  @ApiProperty({ type: [TransactionHistoryItemResponseDto] })
  items!: TransactionHistoryItemResponseDto[];

  @ApiProperty({ nullable: true, type: String })
  nextCursor!: string | null;
}

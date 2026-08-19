import { BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';

export const MONEY_SCALE = 4;

export function parseMoney(value: string): Decimal {
  let amount: Decimal;

  try {
    amount = new Decimal(value);
  } catch {
    throw new BadRequestException({
      code: 'INVALID_AMOUNT',
      message: 'Amount must be a valid decimal string.',
    });
  }

  if (!amount.isFinite() || amount.decimalPlaces() > MONEY_SCALE) {
    throw new BadRequestException({
      code: 'INVALID_AMOUNT',
      message: 'Amount must have at most four decimal places.',
    });
  }

  if (amount.lte(0)) {
    throw new BadRequestException({
      code: 'INVALID_AMOUNT',
      message: 'Amount must be greater than zero.',
    });
  }

  return amount;
}

export function serializeMoney(value: Decimal | string): string {
  return new Decimal(value).toFixed(MONEY_SCALE);
}

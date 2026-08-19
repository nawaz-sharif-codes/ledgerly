import Decimal from 'decimal.js';
import type { ValueTransformer } from 'typeorm';

export const decimalTransformer: ValueTransformer = {
  from(value: string | null): Decimal | null {
    return value === null ? null : new Decimal(value);
  },
  to(value: Decimal | string | null): string | null {
    return value === null ? null : new Decimal(value).toFixed(4);
  },
};

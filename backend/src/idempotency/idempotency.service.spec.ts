import type { DataSource } from 'typeorm';
import { IdempotencyService } from './idempotency.service';

describe('IdempotencyService hashing', () => {
  const service = new IdempotencyService({} as DataSource);

  it('produces the same SHA-256 hash regardless of object key order', () => {
    const first = service.hash({
      operation: 'transfer',
      fromWalletId: 'from',
      toWalletId: 'to',
      amount: '25.0000',
    });
    const second = service.hash({
      amount: '25.0000',
      toWalletId: 'to',
      fromWalletId: 'from',
      operation: 'transfer',
    });

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it('changes the hash when a normalized request value changes', () => {
    expect(service.hash({ amount: '25.0000' })).not.toBe(
      service.hash({ amount: '25.0001' }),
    );
  });
});

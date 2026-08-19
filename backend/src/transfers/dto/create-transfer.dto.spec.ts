import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTransferDto } from './create-transfer.dto';

describe('CreateTransferDto', () => {
  const walletA = '10000000-0000-4000-8000-000000000001';
  const walletB = '10000000-0000-4000-8000-000000000002';

  it('accepts UUID wallets and a decimal string with four places', async () => {
    const dto = plainToInstance(CreateTransferDto, {
      fromWalletId: walletA,
      toWalletId: walletB,
      amount: '250.1234',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([250, '0.00001', '-1.00', 'not-money'])(
    'rejects invalid money input %p',
    async (amount) => {
      const dto = plainToInstance(CreateTransferDto, {
        fromWalletId: walletA,
        toWalletId: walletB,
        amount,
      });

      const errors = await validate(dto);
      expect(errors.some((error) => error.property === 'amount')).toBe(true);
    },
  );
});

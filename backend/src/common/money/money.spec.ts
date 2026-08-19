import Decimal from 'decimal.js';
import { parseMoney, serializeMoney } from './money';

describe('money helpers', () => {
  it('parses and serializes four-decimal values without floating point', () => {
    const amount = parseMoney('1000.1234');

    expect(amount).toBeInstanceOf(Decimal);
    expect(serializeMoney(amount)).toBe('1000.1234');
  });

  it.each(['0', '-1', '1.00001', 'not-money'])(
    'rejects invalid amount %s',
    (value) => {
      expect(() => parseMoney(value)).toThrow();
    },
  );
});

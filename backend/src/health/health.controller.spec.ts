import { HealthController } from './health.controller';

describe('HealthController', () => {
  const query = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
  const controller = new HealthController({ query } as never);

  it('reports the API as healthy', () => {
    expect(controller.getHealth()).toEqual(
      expect.objectContaining({
        status: 'ok',
        service: 'ledgerly-api',
      }),
    );
  });

  it('checks PostgreSQL before reporting readiness', async () => {
    await expect(controller.getReadiness()).resolves.toEqual(
      expect.objectContaining({ status: 'ok' }),
    );
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });
});

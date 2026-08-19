import { HealthController } from './health.controller';

describe('HealthController', () => {
  const controller = new HealthController();

  it('reports the API as healthy', () => {
    expect(controller.getHealth()).toEqual(
      expect.objectContaining({
        status: 'ok',
        service: 'ledgerly-api',
      }),
    );
  });
});

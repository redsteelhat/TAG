import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns service health status', () => {
    const service = new HealthService();

    expect(service.getHealth()).toMatchObject({
      status: 'ok',
      service: 'tag-api'
    });
  });
});


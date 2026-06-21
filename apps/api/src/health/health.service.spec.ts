import { HealthService } from './health.service';

const prisma = {
  $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }])
};

const queueService = {
  getStats: jest.fn().mockReturnValue({
    activeCount: 0,
    concurrency: 2,
    counts: {
      COMPLETED: 3,
      FAILED: 0,
      PENDING: 0,
      PROCESSING: 0
    },
    maxAttempts: 3,
    pendingCount: 0,
    totalCount: 3
  })
};

describe('HealthService', () => {
  it('returns service health status', () => {
    const service = new HealthService(prisma as never, queueService as never);

    expect(service.getHealth()).toMatchObject({
      status: 'ok',
      service: 'tag-api'
    });
  });

  it('returns readiness with database and queue checks', async () => {
    const service = new HealthService(prisma as never, queueService as never);

    await expect(service.getReadiness()).resolves.toMatchObject({
      status: 'ok',
      checks: {
        database: {
          status: 'ok'
        },
        queue: {
          status: 'ok',
          pendingCount: 0
        }
      }
    });
  });
});

import { QueueService } from './queue.service';

function createConfig(values: Record<string, string | number> = {}) {
  return {
    get: jest.fn((key: string, fallback: string | number) => {
      return values[key] ?? fallback;
    })
  };
}

function waitForQueue() {
  return new Promise((resolve) => {
    setTimeout(resolve, 20);
  });
}

describe('QueueService', () => {
  it('processes queued jobs', async () => {
    const service = new QueueService(createConfig({ QUEUE_CONCURRENCY: 1 }) as never);
    const handler = jest.fn().mockResolvedValue(undefined);

    const job = service.enqueue('test.job', { id: 'payload_1' }, handler);

    expect(job.status).toBe('PENDING');

    await waitForQueue();

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        id: job.id,
        name: 'test.job',
        payload: {
          id: 'payload_1'
        }
      })
    );
    expect(service.getStats().counts.COMPLETED).toBe(1);
  });

  it('retries failed jobs up to max attempts', async () => {
    const service = new QueueService(
      createConfig({
        QUEUE_CONCURRENCY: 1,
        QUEUE_MAX_ATTEMPTS: 2
      }) as never
    );
    const handler = jest
      .fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(undefined);

    service.enqueue('test.retry', { id: 'payload_1' }, handler);

    await waitForQueue();
    await waitForQueue();

    expect(handler).toHaveBeenCalledTimes(2);
    expect(service.getStats().counts.COMPLETED).toBe(1);
    expect(service.getStats().counts.FAILED).toBe(0);
  });

  it('marks jobs as failed after max attempts', async () => {
    const service = new QueueService(
      createConfig({
        QUEUE_CONCURRENCY: 1,
        QUEUE_MAX_ATTEMPTS: 1
      }) as never
    );
    const handler = jest.fn().mockRejectedValue(new Error('permanent failure'));

    service.enqueue('test.failed', { id: 'payload_1' }, handler);

    await waitForQueue();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(service.getStats().counts.FAILED).toBe(1);
  });
});

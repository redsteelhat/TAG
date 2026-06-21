import { ErrorTrackingService } from './error-tracking.service';

function createConfig(values: Record<string, string | number | undefined>) {
  return {
    get: jest.fn(
      (key: string, fallback?: string | number) => values[key] ?? fallback
    )
  };
}

describe('ErrorTrackingService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('does not send events when error tracking is disabled', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as never;
    const service = new ErrorTrackingService(
      createConfig({
        ERROR_TRACKING_ENABLED: 'false'
      }) as never
    );

    const result = await service.captureException(new Error('Boom'), {
      source: 'test'
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.captured).toBe(false);
  });

  it('sends masked events to the configured webhook', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 202
    });
    global.fetch = fetchMock as never;
    const service = new ErrorTrackingService(
      createConfig({
        ERROR_TRACKING_AUTH_TOKEN: 'secret-token',
        ERROR_TRACKING_ENABLED: 'true',
        ERROR_TRACKING_ENVIRONMENT: 'test',
        ERROR_TRACKING_RELEASE: 'test-release',
        ERROR_TRACKING_SAMPLE_RATE: '1',
        ERROR_TRACKING_WEBHOOK_URL: 'https://errors.example.com/ingest'
      }) as never
    );

    const result = await service.captureException(
      new Error(
        'Trip failed for surucu@example.com phone +905551112233 plate 34 ABC 123 Bearer secret.jwt.token'
      ),
      {
        extra: {
          grossIncome: 1500,
          phone: '+905551112233',
          plateNumber: '34 ABC 123'
        },
        request: {
          method: 'GET',
          path: '/api/v1/test?email=surucu@example.com&token=secret'
        },
        source: 'test.case',
        tags: {
          statusCode: 500
        }
      }
    );

    expect(result.captured).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://errors.example.com/ingest',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer secret-token',
          'content-type': 'application/json'
        }),
        method: 'POST'
      })
    );

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);

    expect(payload.environment).toBe('test');
    expect(payload.release).toBe('test-release');
    expect(payload.error.message).toContain('s***@example.com');
    expect(payload.error.message).toContain('[MASKED_PHONE]:33');
    expect(payload.error.message).toContain('[MASKED_PLATE]');
    expect(payload.request.path).toBe(
      '/api/v1/test?email=[MASKED]&token=[MASKED]'
    );
    expect(payload.extra).toEqual({
      grossIncome: '[MASKED]',
      phone: '[MASKED_PHONE]:33',
      plateNumber: '[MASKED_PLATE]'
    });
  });
});

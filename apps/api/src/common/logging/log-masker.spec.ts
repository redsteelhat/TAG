import { maskLogMessage, maskSensitiveData } from './log-masker';

describe('log masker', () => {
  it('masks sensitive scalar values in log messages', () => {
    const message = maskLogMessage(
      'login failed for surucu@example.com phone +905551112233 plate 34 ABC 123 bearer Bearer abc.def.ghi'
    );

    expect(message).toContain('s***@example.com');
    expect(message).toContain('[MASKED_PHONE]:33');
    expect(message).toContain('[MASKED_PLATE]');
    expect(message).toContain('Bearer [MASKED_TOKEN]');
    expect(message).not.toContain('+905551112233');
    expect(message).not.toContain('34 ABC 123');
  });

  it('masks sensitive query params without removing safe params', () => {
    const message = maskLogMessage(
      'GET /api/v1/profile?email=surucu%40example.com&page=2&token=secret'
    );

    expect(message).toContain('email=[MASKED]');
    expect(message).toContain('page=2');
    expect(message).toContain('token=[MASKED]');
    expect(message).not.toContain('surucu%40example.com');
    expect(message).not.toContain('secret');
  });

  it('recursively masks sensitive object keys', () => {
    const masked = maskSensitiveData({
      email: 'surucu@example.com',
      ipAddress: '192.168.10.42',
      nested: {
        grossIncome: 1500,
        note: 'Yolcu telefonu +905551112233',
        plateNumber: '34 ABC 123'
      },
      safe: 'kept'
    });

    expect(masked).toEqual({
      email: 's***@example.com',
      ipAddress: '192.168.***.***',
      nested: {
        grossIncome: '[MASKED]',
        note: '[MASKED]',
        plateNumber: '[MASKED_PLATE]'
      },
      safe: 'kept'
    });
  });
});

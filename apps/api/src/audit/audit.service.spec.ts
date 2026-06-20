import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('masks sensitive audit fields before persistence', async () => {
    const prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({})
      }
    };
    const service = new AuditService(prisma as never);

    await service.log({
      action: 'auth.login',
      ipAddress: '192.168.10.42',
      metadata: {
        path: '/api/v1/auth/login?email=surucu@example.com&token=secret',
        phone: '+905551112233',
        statusCode: 201
      },
      userAgent: 'Mozilla/5.0',
      userId: 'user_1'
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ip_address: '192.168.***.***',
        metadata: {
          path: '/api/v1/auth/login?email=[MASKED]&token=[MASKED]',
          phone: '[MASKED_PHONE]:33',
          statusCode: 201
        },
        user_agent: '[MASKED_USER_AGENT]'
      })
    });
  });
});

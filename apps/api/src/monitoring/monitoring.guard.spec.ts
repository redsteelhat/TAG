import { UnauthorizedException } from '@nestjs/common';
import { MonitoringGuard } from './monitoring.guard';

function createContext(headers: Record<string, string | undefined>) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers
      })
    })
  };
}

describe('MonitoringGuard', () => {
  it('allows requests with the configured monitoring token', async () => {
    const configService = {
      get: jest.fn().mockReturnValue('secret-monitoring-token')
    };
    const tokenService = {
      verifyAccessToken: jest.fn()
    };
    const guard = new MonitoringGuard(
      configService as never,
      tokenService as never
    );

    await expect(
      guard.canActivate(
        createContext({
          'x-monitoring-token': 'secret-monitoring-token'
        }) as never
      )
    ).resolves.toBe(true);
    expect(tokenService.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('allows admin access tokens', async () => {
    const configService = {
      get: jest.fn().mockReturnValue(undefined)
    };
    const tokenService = {
      verifyAccessToken: jest.fn().mockResolvedValue({
        role: 'ADMIN',
        sub: 'user_1'
      })
    };
    const guard = new MonitoringGuard(
      configService as never,
      tokenService as never
    );

    await expect(
      guard.canActivate(
        createContext({
          authorization: 'Bearer access-token'
        }) as never
      )
    ).resolves.toBe(true);
  });

  it('rejects non-admin access tokens', async () => {
    const configService = {
      get: jest.fn().mockReturnValue(undefined)
    };
    const tokenService = {
      verifyAccessToken: jest.fn().mockResolvedValue({
        role: 'USER',
        sub: 'user_1'
      })
    };
    const guard = new MonitoringGuard(
      configService as never,
      tokenService as never
    );

    await expect(
      guard.canActivate(
        createContext({
          authorization: 'Bearer access-token'
        }) as never
      )
    ).rejects.toThrow(UnauthorizedException);
  });
});

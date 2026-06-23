import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { AdminGuard } from "./admin.guard";

function createContext(authorization?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: {
          authorization,
        },
      }),
    }),
  };
}

describe("AdminGuard", () => {
  it("allows admin access tokens", async () => {
    const tokenService = {
      verifyAccessToken: jest.fn().mockResolvedValue({
        role: "ADMIN",
        sub: "user_1",
      }),
    };
    const guard = new AdminGuard(tokenService as never);

    await expect(
      guard.canActivate(createContext("Bearer access-token") as never),
    ).resolves.toBe(true);
  });

  it("rejects regular user access tokens", async () => {
    const tokenService = {
      verifyAccessToken: jest.fn().mockResolvedValue({
        role: "USER",
        sub: "user_1",
      }),
    };
    const guard = new AdminGuard(tokenService as never);

    await expect(
      guard.canActivate(createContext("Bearer access-token") as never),
    ).rejects.toThrow(ForbiddenException);
  });

  it("rejects missing credentials", async () => {
    const guard = new AdminGuard({ verifyAccessToken: jest.fn() } as never);

    await expect(guard.canActivate(createContext() as never)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

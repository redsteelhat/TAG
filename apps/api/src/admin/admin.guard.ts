import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { TokenService } from "../auth/token.service";

const allowedRoles = new Set(["ADMIN", "SUPER_ADMIN"]);

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException("Missing admin credentials.");
    }

    const payload = await this.verifyToken(token);

    if (!allowedRoles.has(payload.role)) {
      throw new ForbiddenException("Admin role is required.");
    }

    return true;
  }

  private async verifyToken(token: string) {
    try {
      return await this.tokenService.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException("Invalid admin credentials.");
    }
  }

  private extractBearerToken(request: Request) {
    const authorization = request.headers.authorization;

    if (!authorization) {
      return undefined;
    }

    const [type, token] = authorization.split(" ");

    return type === "Bearer" && token ? token : undefined;
  }
}

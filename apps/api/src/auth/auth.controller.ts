import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuditLog } from '../audit/audit-log.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
@ApiTags('Auth')
@Throttle({ default: { limit: 10, ttl: 60000 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Create a user account and initial session' })
  @AuditLog({
    action: 'auth.register',
    entityType: 'user',
    entityIdPath: 'data.user.id',
    userIdPath: 'data.user.id'
  })
  async register(@Body() dto: RegisterDto) {
    return {
      data: await this.authService.register(dto)
    };
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @AuditLog({
    action: 'auth.login',
    entityType: 'user',
    entityIdPath: 'data.user.id',
    userIdPath: 'data.user.id'
  })
  async login(@Body() dto: LoginDto) {
    return {
      data: await this.authService.login(dto)
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token and issue a new access token' })
  @AuditLog({ action: 'auth.refresh', entityType: 'user' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return {
      data: await this.authService.refresh(dto.refreshToken)
    };
  }
}

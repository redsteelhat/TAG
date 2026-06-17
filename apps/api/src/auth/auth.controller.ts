import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
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
  async register(@Body() dto: RegisterDto) {
    return {
      data: await this.authService.register(dto)
    };
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto) {
    return {
      data: await this.authService.login(dto)
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token and issue a new access token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return {
      data: await this.authService.refresh(dto.refreshToken)
    };
  }
}

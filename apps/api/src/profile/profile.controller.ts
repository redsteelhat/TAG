import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { ProfileService } from './profile.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return {
      data: await this.profileService.getMe(user.id)
    };
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMeDto
  ) {
    return {
      data: await this.profileService.updateMe(user.id, dto)
    };
  }

  @Get('driver-profile')
  async getDriverProfile(@CurrentUser() user: AuthenticatedUser) {
    return {
      data: await this.profileService.getDriverProfile(user.id)
    };
  }

  @Patch('driver-profile')
  async updateDriverProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateDriverProfileDto
  ) {
    return {
      data: await this.profileService.updateDriverProfile(user.id, dto)
    };
  }
}


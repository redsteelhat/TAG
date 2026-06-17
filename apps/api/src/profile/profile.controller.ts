import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { ProfileService } from './profile.service';

@UseGuards(JwtAuthGuard)
@Controller()
@ApiTags('Profile')
@ApiBearerAuth('access-token')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return {
      data: await this.profileService.getMe(user.id)
    };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMeDto
  ) {
    return {
      data: await this.profileService.updateMe(user.id, dto)
    };
  }

  @Get('driver-profile')
  @ApiOperation({ summary: 'Get driver finance preferences' })
  async getDriverProfile(@CurrentUser() user: AuthenticatedUser) {
    return {
      data: await this.profileService.getDriverProfile(user.id)
    };
  }

  @Patch('driver-profile')
  @ApiOperation({ summary: 'Update driver finance preferences' })
  async updateDriverProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateDriverProfileDto
  ) {
    return {
      data: await this.profileService.updateDriverProfile(user.id, dto)
    };
  }
}

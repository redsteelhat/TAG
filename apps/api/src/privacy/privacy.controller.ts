import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLog } from '../audit/audit-log.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AcceptPrivacyConsentDto } from './dto/accept-privacy-consent.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { PrivacyService } from './privacy.service';

@UseGuards(JwtAuthGuard)
@Controller('privacy')
@ApiTags('Privacy / KVKK')
@ApiBearerAuth('access-token')
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get current user KVKK consent status' })
  async getStatus(@CurrentUser() user: AuthenticatedUser) {
    return {
      data: await this.privacyService.getStatus(user.id)
    };
  }

  @Post('consent')
  @ApiOperation({ summary: 'Record current user KVKK/privacy consent' })
  @AuditLog({
    action: 'privacy.consent.accept',
    entityType: 'user'
  })
  async acceptConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AcceptPrivacyConsentDto
  ) {
    return {
      data: await this.privacyService.acceptConsent(user.id, dto)
    };
  }

  @Get('export')
  @ApiOperation({ summary: 'Export current user personal data as JSON' })
  @AuditLog({
    action: 'privacy.data_export',
    entityType: 'user'
  })
  async exportPersonalData(@CurrentUser() user: AuthenticatedUser) {
    return {
      data: await this.privacyService.exportPersonalData(user.id)
    };
  }

  @Delete('me')
  @ApiOperation({ summary: 'Request account deletion and anonymize personal data' })
  @AuditLog({
    action: 'privacy.account_delete',
    entityType: 'user'
  })
  async deleteAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DeleteAccountDto
  ) {
    return {
      data: await this.privacyService.deleteAccount(user.id, dto)
    };
  }
}

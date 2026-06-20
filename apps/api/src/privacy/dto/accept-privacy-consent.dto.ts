import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsBoolean, IsOptional, IsString } from 'class-validator';

export class AcceptPrivacyConsentDto {
  @ApiProperty({ example: true })
  @Equals(true)
  @IsBoolean()
  kvkkAccepted!: boolean;

  @ApiPropertyOptional({ example: 'kvkk-2026-06' })
  @IsOptional()
  @IsString()
  kvkkVersion?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  explicitConsentAccepted?: boolean;

  @ApiPropertyOptional({ example: 'explicit-consent-2026-06' })
  @IsOptional()
  @IsString()
  explicitConsentVersion?: string;

  @ApiPropertyOptional({ example: 'privacy-notice-2026-06' })
  @IsOptional()
  @IsString()
  privacyNoticeVersion?: string;
}

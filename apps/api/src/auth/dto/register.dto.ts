import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'surucu@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+905551112233' })
  @IsOptional()
  @IsPhoneNumber('TR')
  phone?: string;

  @ApiProperty({ minLength: 8, example: 'StrongPass123' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ example: 'Ali Yilmaz' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'iPhone 15 Pro' })
  @IsOptional()
  @IsString()
  deviceName?: string;

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

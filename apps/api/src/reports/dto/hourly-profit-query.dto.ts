import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  Matches
} from 'class-validator';

export enum HourlyProfitPeriod {
  DAILY = 'daily',
  MONTHLY = 'monthly',
  WEEKLY = 'weekly'
}

export class HourlyProfitQueryDto {
  @ApiPropertyOptional({
    enum: HourlyProfitPeriod,
    example: HourlyProfitPeriod.DAILY
  })
  @IsOptional()
  @IsEnum(HourlyProfitPeriod)
  period?: HourlyProfitPeriod;

  @ApiPropertyOptional({
    description: 'Date used for daily, weekly, or monthly period resolution.',
    example: '2026-06-18'
  })
  @IsOptional()
  @IsISO8601()
  date?: string;

  @ApiPropertyOptional({
    description:
      'Explicit weekly start date. Takes precedence when period is weekly.',
    example: '2026-06-15'
  })
  @IsOptional()
  @IsISO8601()
  weekStart?: string;

  @ApiPropertyOptional({
    description:
      'Target month in YYYY-MM format. Takes precedence when period is monthly.',
    example: '2026-06'
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string;

  @ApiPropertyOptional({ example: 'veh_123' })
  @IsOptional()
  @IsString()
  vehicleId?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, Matches } from 'class-validator';

export class ReportOverviewQueryDto {
  @ApiPropertyOptional({
    description:
      'Reference date for daily report and default weekly/monthly resolution.',
    example: '2026-06-18'
  })
  @IsOptional()
  @IsISO8601()
  date?: string;

  @ApiPropertyOptional({
    description: 'Explicit week start date for weekly report.',
    example: '2026-06-15'
  })
  @IsOptional()
  @IsISO8601()
  weekStart?: string;

  @ApiPropertyOptional({
    description: 'Target month in YYYY-MM format for monthly report.',
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

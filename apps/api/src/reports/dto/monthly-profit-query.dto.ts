import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, Matches } from 'class-validator';

export class MonthlyProfitQueryDto {
  @ApiPropertyOptional({
    description: 'Target month in YYYY-MM format. Takes precedence over date.',
    example: '2026-06'
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string;

  @ApiPropertyOptional({
    description: 'Any date inside the target month.',
    example: '2026-06-18'
  })
  @IsOptional()
  @IsISO8601()
  date?: string;

  @ApiPropertyOptional({ example: 'veh_123' })
  @IsOptional()
  @IsString()
  vehicleId?: string;
}

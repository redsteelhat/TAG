import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class WeeklyProfitQueryDto {
  @ApiPropertyOptional({
    description: 'Any date inside the target week. Week starts on Monday.',
    example: '2026-06-18'
  })
  @IsOptional()
  @IsISO8601()
  date?: string;

  @ApiPropertyOptional({
    description: 'Explicit week start date. Takes precedence over date.',
    example: '2026-06-15'
  })
  @IsOptional()
  @IsISO8601()
  weekStart?: string;

  @ApiPropertyOptional({ example: 'veh_123' })
  @IsOptional()
  @IsString()
  vehicleId?: string;
}

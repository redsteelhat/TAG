import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';

export enum ExcelExportPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY'
}

export class CreateExcelExportDto {
  @ApiPropertyOptional({
    enum: ExcelExportPeriod,
    example: ExcelExportPeriod.MONTHLY
  })
  @IsOptional()
  @IsEnum(ExcelExportPeriod)
  period?: ExcelExportPeriod = ExcelExportPeriod.MONTHLY;

  @ApiPropertyOptional({ example: '2026-06-18' })
  @IsOptional()
  @IsISO8601()
  date?: string;

  @ApiPropertyOptional({ example: '2026-06-15' })
  @IsOptional()
  @IsISO8601()
  weekStart?: string;

  @ApiPropertyOptional({ example: '2026-06' })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiPropertyOptional({ example: 'veh_123' })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  includeRawData?: boolean = true;
}

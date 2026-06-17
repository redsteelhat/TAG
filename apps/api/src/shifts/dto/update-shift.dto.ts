import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShiftStatus } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';
import { IsDecimalString } from '../../common/validators/decimal-string.decorator';

export class UpdateShiftDto {
  @ApiPropertyOptional({ example: 'veh_123' })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional({ example: '2026-06-17T09:00:00+03:00' })
  @IsOptional()
  @IsISO8601()
  startedAt?: string;

  @ApiPropertyOptional({ example: '2026-06-17T18:30:00+03:00' })
  @IsOptional()
  @IsISO8601()
  endedAt?: string;

  @ApiPropertyOptional({ example: '85000.0' })
  @IsOptional()
  @IsDecimalString()
  startOdometerKm?: string;

  @ApiPropertyOptional({ example: '85142.5' })
  @IsOptional()
  @IsDecimalString()
  endOdometerKm?: string;

  @ApiPropertyOptional({ enum: ShiftStatus })
  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;

  @ApiPropertyOptional({ example: 'Aksam yogunlugu hedeflendi' })
  @IsOptional()
  @IsString()
  note?: string;
}

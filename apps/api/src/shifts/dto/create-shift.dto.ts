import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShiftStatus } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';
import { IsDecimalString } from '../../common/validators/decimal-string.decorator';

export class CreateShiftDto {
  @ApiProperty({ example: 'veh_123' })
  @IsString()
  vehicleId!: string;

  @ApiProperty({ example: '2026-06-17T09:00:00+03:00' })
  @IsISO8601()
  startedAt!: string;

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

  @ApiPropertyOptional({ enum: ShiftStatus, example: ShiftStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;

  @ApiPropertyOptional({ example: 'Aksam yogunlugu hedeflendi' })
  @IsOptional()
  @IsString()
  note?: string;
}

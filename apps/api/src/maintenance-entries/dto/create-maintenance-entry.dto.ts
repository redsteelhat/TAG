import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AllocationType } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';
import { IsDecimalString } from '../../common/validators/decimal-string.decorator';

export class CreateMaintenanceEntryDto {
  @ApiProperty({ example: 'veh_123' })
  @IsString()
  vehicleId!: string;

  @ApiProperty({ example: 'Periyodik bakim' })
  @IsString()
  category!: string;

  @ApiProperty({ example: 'Yag, filtre ve iscilik' })
  @IsString()
  title!: string;

  @ApiProperty({ example: '8000.00' })
  @IsDecimalString()
  amount!: string;

  @ApiProperty({ example: '2026-08-18' })
  @IsISO8601()
  maintenanceDate!: string;

  @ApiPropertyOptional({ example: '85120.5' })
  @IsOptional()
  @IsDecimalString()
  odometerKm?: string;

  @ApiPropertyOptional({ example: '10000.0' })
  @IsOptional()
  @IsDecimalString()
  expectedIntervalKm?: string;

  @ApiPropertyOptional({ example: 'Yetkili Servis Kadikoy' })
  @IsOptional()
  @IsString()
  serviceName?: string;

  @ApiPropertyOptional({
    enum: AllocationType,
    example: AllocationType.PER_KM
  })
  @IsOptional()
  @IsEnum(AllocationType)
  allocationType?: AllocationType;

  @ApiPropertyOptional({ example: 'Sonraki bakim 95.000 km civari.' })
  @IsOptional()
  @IsString()
  note?: string;
}

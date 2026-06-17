import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DepreciationModel, FuelType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min
} from 'class-validator';
import { IsDecimalString } from '../../common/validators/decimal-string.decorator';

export class CreateVehicleDto {
  @ApiProperty({ example: '34ABC123' })
  @IsString()
  plateNumber!: string;

  @ApiPropertyOptional({ example: 'Toyota' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: 'Corolla' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 2020, minimum: 1950, maximum: 2100 })
  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  modelYear?: number;

  @ApiProperty({ enum: FuelType, example: FuelType.GASOLINE })
  @IsEnum(FuelType)
  fuelType!: FuelType;

  @ApiProperty({ example: '7.50' })
  @IsDecimalString()
  averageConsumptionLPer100Km!: string;

  @ApiPropertyOptional({ example: '85000.00' })
  @IsOptional()
  @IsDecimalString()
  odometerKm?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  depreciationEnabled?: boolean;

  @ApiPropertyOptional({ enum: DepreciationModel })
  @IsOptional()
  @IsEnum(DepreciationModel)
  depreciationModel?: DepreciationModel;

  @ApiPropertyOptional({ example: '60000.00' })
  @IsOptional()
  @IsDecimalString()
  annualDepreciationAmount?: string;

  @ApiPropertyOptional({ example: '30000.00' })
  @IsOptional()
  @IsDecimalString()
  annualEstimatedKm?: string;
}

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

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  plateNumber?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  modelYear?: number;

  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @IsOptional()
  @IsDecimalString()
  averageConsumptionLPer100Km?: string;

  @IsOptional()
  @IsDecimalString()
  odometerKm?: string;

  @IsOptional()
  @IsBoolean()
  depreciationEnabled?: boolean;

  @IsOptional()
  @IsEnum(DepreciationModel)
  depreciationModel?: DepreciationModel;

  @IsOptional()
  @IsDecimalString()
  annualDepreciationAmount?: string;

  @IsOptional()
  @IsDecimalString()
  annualEstimatedKm?: string;
}


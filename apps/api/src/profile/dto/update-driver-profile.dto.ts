import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches
} from 'class-validator';
import { FixedCostAllocationMethod } from '@prisma/client';

export class UpdateDriverProfileDto {
  @IsOptional()
  @IsString()
  defaultVehicleId?: string;

  @IsOptional()
  @IsEnum(FixedCostAllocationMethod)
  fixedCostAllocationMethod?: FixedCostAllocationMethod;

  @IsOptional()
  @IsBoolean()
  showDepreciationInProfit?: boolean;

  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/)
  dailyTargetNetProfit?: string;
}


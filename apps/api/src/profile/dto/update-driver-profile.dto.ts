import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches
} from 'class-validator';
import { FixedCostAllocationMethod } from '@prisma/client';

export class UpdateDriverProfileDto {
  @ApiPropertyOptional({ example: 'vehicle_id' })
  @IsOptional()
  @IsString()
  defaultVehicleId?: string;

  @ApiPropertyOptional({ enum: FixedCostAllocationMethod })
  @IsOptional()
  @IsEnum(FixedCostAllocationMethod)
  fixedCostAllocationMethod?: FixedCostAllocationMethod;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  showDepreciationInProfit?: boolean;

  @ApiPropertyOptional({ example: '1500.00' })
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/)
  dailyTargetNetProfit?: string;
}

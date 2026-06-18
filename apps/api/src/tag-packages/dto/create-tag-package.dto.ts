import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PackageAllocationMethod } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Min
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsDecimalString } from '../../common/validators/decimal-string.decorator';

export class CreateTagPackageDto {
  @ApiProperty({ example: 'veh_123' })
  @IsString()
  vehicleId!: string;

  @ApiProperty({ example: 'Haftalik TAG paketi' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '700.00' })
  @IsDecimalString()
  amount!: string;

  @ApiProperty({ example: '2026-06-18' })
  @IsISO8601()
  startsAt!: string;

  @ApiProperty({ example: '2026-06-24' })
  @IsISO8601()
  endsAt!: string;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays?: number;

  @ApiPropertyOptional({
    enum: PackageAllocationMethod,
    example: PackageAllocationMethod.PER_DAY
  })
  @IsOptional()
  @IsEnum(PackageAllocationMethod)
  allocationMethod?: PackageAllocationMethod;

  @ApiPropertyOptional({ example: '1240.00' })
  @IsOptional()
  @IsDecimalString()
  breakEvenTarget?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Haftalik operasyon paketi' })
  @IsOptional()
  @IsString()
  note?: string;
}

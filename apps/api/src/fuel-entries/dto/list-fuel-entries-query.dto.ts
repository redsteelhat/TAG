import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { FuelType, PaymentMethodType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString
} from 'class-validator';
import {
  PaginationQueryDto,
  SortDirection
} from '../../common/dto/pagination-query.dto';
import { IsDecimalString } from '../../common/validators/decimal-string.decorator';

export enum FuelEntrySortBy {
  AMOUNT = 'amount',
  CREATED_AT = 'createdAt',
  LITERS = 'liters',
  ODOMETER_KM = 'odometerKm',
  PRICE_PER_LITER = 'pricePerLiter'
}

export class ListFuelEntriesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'veh_123' })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional({ enum: FuelType })
  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @ApiPropertyOptional({ enum: PaymentMethodType })
  @IsOptional()
  @IsEnum(PaymentMethodType)
  paymentMethod?: PaymentMethodType;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    return value;
  })
  @IsBoolean()
  fullTank?: boolean;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({ example: 'Shell' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: '500.00' })
  @IsOptional()
  @IsDecimalString()
  minAmount?: string;

  @ApiPropertyOptional({ example: '3000.00' })
  @IsOptional()
  @IsDecimalString()
  maxAmount?: string;

  @ApiPropertyOptional({ example: '10.000' })
  @IsOptional()
  @IsDecimalString()
  minLiters?: string;

  @ApiPropertyOptional({ example: '70.000' })
  @IsOptional()
  @IsDecimalString()
  maxLiters?: string;

  @ApiPropertyOptional({ example: '80000.0' })
  @IsOptional()
  @IsDecimalString()
  minOdometerKm?: string;

  @ApiPropertyOptional({ example: '90000.0' })
  @IsOptional()
  @IsDecimalString()
  maxOdometerKm?: string;

  @ApiPropertyOptional({
    enum: FuelEntrySortBy,
    example: FuelEntrySortBy.CREATED_AT
  })
  @IsOptional()
  @IsEnum(FuelEntrySortBy)
  sortBy?: FuelEntrySortBy = FuelEntrySortBy.CREATED_AT;

  @ApiPropertyOptional({ enum: SortDirection, example: SortDirection.DESC })
  @IsOptional()
  @IsEnum(SortDirection)
  sortDirection?: SortDirection = SortDirection.DESC;
}

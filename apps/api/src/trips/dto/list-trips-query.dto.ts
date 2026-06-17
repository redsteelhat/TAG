import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodType } from '@prisma/client';
import {
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

export enum TripSortBy {
  CREATED_AT = 'createdAt',
  TOTAL_INCOME = 'totalIncome',
  TOTAL_KM = 'totalKm',
  TRIP_DATE = 'tripDate',
  TRUE_NET_PROFIT = 'trueNetProfit'
}

export class ListTripsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'veh_123' })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional({ example: 'shf_123' })
  @IsOptional()
  @IsString()
  shiftId?: string;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({ enum: PaymentMethodType })
  @IsOptional()
  @IsEnum(PaymentMethodType)
  paymentMethod?: PaymentMethodType;

  @ApiPropertyOptional({ example: 'Kadikoy' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: '250.00' })
  @IsOptional()
  @IsDecimalString()
  minTotalIncome?: string;

  @ApiPropertyOptional({ example: '1000.00' })
  @IsOptional()
  @IsDecimalString()
  maxTotalIncome?: string;

  @ApiPropertyOptional({ example: '5.00' })
  @IsOptional()
  @IsDecimalString()
  minTotalKm?: string;

  @ApiPropertyOptional({ example: '100.00' })
  @IsOptional()
  @IsDecimalString()
  maxTotalKm?: string;

  @ApiPropertyOptional({ enum: TripSortBy, example: TripSortBy.TRIP_DATE })
  @IsOptional()
  @IsEnum(TripSortBy)
  sortBy?: TripSortBy = TripSortBy.TRIP_DATE;

  @ApiPropertyOptional({ enum: SortDirection, example: SortDirection.DESC })
  @IsOptional()
  @IsEnum(SortDirection)
  sortDirection?: SortDirection = SortDirection.DESC;
}

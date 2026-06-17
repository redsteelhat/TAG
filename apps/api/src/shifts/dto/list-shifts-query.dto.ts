import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShiftStatus } from '@prisma/client';
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

export enum ShiftSortBy {
  CREATED_AT = 'createdAt',
  GROSS_INCOME = 'grossIncome',
  STARTED_AT = 'startedAt',
  TOTAL_KM = 'totalKm',
  TRUE_NET_PROFIT = 'trueNetProfit'
}

export class ListShiftsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'veh_123' })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional({ enum: ShiftStatus })
  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({ example: 'aksam' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: '500.00' })
  @IsOptional()
  @IsDecimalString()
  minGrossIncome?: string;

  @ApiPropertyOptional({ example: '5000.00' })
  @IsOptional()
  @IsDecimalString()
  maxGrossIncome?: string;

  @ApiPropertyOptional({ example: '10.0' })
  @IsOptional()
  @IsDecimalString()
  minTotalKm?: string;

  @ApiPropertyOptional({ example: '300.0' })
  @IsOptional()
  @IsDecimalString()
  maxTotalKm?: string;

  @ApiPropertyOptional({ enum: ShiftSortBy, example: ShiftSortBy.STARTED_AT })
  @IsOptional()
  @IsEnum(ShiftSortBy)
  sortBy?: ShiftSortBy = ShiftSortBy.STARTED_AT;

  @ApiPropertyOptional({ enum: SortDirection, example: SortDirection.DESC })
  @IsOptional()
  @IsEnum(SortDirection)
  sortDirection?: SortDirection = SortDirection.DESC;
}

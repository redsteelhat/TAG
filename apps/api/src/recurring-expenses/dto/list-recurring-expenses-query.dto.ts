import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  AllocationType,
  ExpenseType,
  FixedCostAllocationMethod
} from '@prisma/client';
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

export enum RecurringExpenseSortBy {
  AMOUNT = 'amount',
  CREATED_AT = 'createdAt',
  NEXT_DUE_AT = 'nextDueAt',
  STARTS_AT = 'startsAt'
}

export class ListRecurringExpensesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'veh_123' })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional({ enum: ExpenseType })
  @IsOptional()
  @IsEnum(ExpenseType)
  expenseType?: ExpenseType;

  @ApiPropertyOptional({ enum: AllocationType })
  @IsOptional()
  @IsEnum(AllocationType)
  period?: AllocationType;

  @ApiPropertyOptional({ enum: FixedCostAllocationMethod })
  @IsOptional()
  @IsEnum(FixedCostAllocationMethod)
  allocationMethod?: FixedCostAllocationMethod;

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
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({ example: 'sigorta' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: '100.00' })
  @IsOptional()
  @IsDecimalString()
  minAmount?: string;

  @ApiPropertyOptional({ example: '5000.00' })
  @IsOptional()
  @IsDecimalString()
  maxAmount?: string;

  @ApiPropertyOptional({
    enum: RecurringExpenseSortBy,
    example: RecurringExpenseSortBy.NEXT_DUE_AT
  })
  @IsOptional()
  @IsEnum(RecurringExpenseSortBy)
  sortBy?: RecurringExpenseSortBy = RecurringExpenseSortBy.NEXT_DUE_AT;

  @ApiPropertyOptional({ enum: SortDirection, example: SortDirection.ASC })
  @IsOptional()
  @IsEnum(SortDirection)
  sortDirection?: SortDirection = SortDirection.ASC;
}

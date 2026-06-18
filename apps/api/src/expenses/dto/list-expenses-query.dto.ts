import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { AllocationType, ExpenseType, PaymentMethodType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  PaginationQueryDto,
  SortDirection,
} from '../../common/dto/pagination-query.dto';
import { IsDecimalString } from '../../common/validators/decimal-string.decorator';

export enum ExpenseSortBy {
  AMOUNT = 'amount',
  CREATED_AT = 'createdAt',
  EXPENSE_DATE = 'expenseDate',
}

export class ListExpensesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'veh_123' })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional({ example: 'cat_123' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: ExpenseType })
  @IsOptional()
  @IsEnum(ExpenseType)
  expenseType?: ExpenseType;

  @ApiPropertyOptional({ enum: AllocationType })
  @IsOptional()
  @IsEnum(AllocationType)
  allocationType?: AllocationType;

  @ApiPropertyOptional({ enum: PaymentMethodType })
  @IsOptional()
  @IsEnum(PaymentMethodType)
  paymentMethod?: PaymentMethodType;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({ example: 'otopark' })
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
  isRecurring?: boolean;

  @ApiPropertyOptional({
    enum: ExpenseSortBy,
    example: ExpenseSortBy.EXPENSE_DATE,
  })
  @IsOptional()
  @IsEnum(ExpenseSortBy)
  sortBy?: ExpenseSortBy = ExpenseSortBy.EXPENSE_DATE;

  @ApiPropertyOptional({ enum: SortDirection, example: SortDirection.DESC })
  @IsOptional()
  @IsEnum(SortDirection)
  sortDirection?: SortDirection = SortDirection.DESC;
}

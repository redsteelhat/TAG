import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AllocationType, ExpenseType, PaymentMethodType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
} from 'class-validator';
import { IsDecimalString } from '../../common/validators/decimal-string.decorator';

export class CreateExpenseDto {
  @ApiProperty({ example: 'veh_123' })
  @IsString()
  vehicleId!: string;

  @ApiPropertyOptional({ example: 'cat_123' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ enum: ExpenseType, example: ExpenseType.VARIABLE })
  @IsEnum(ExpenseType)
  expenseType!: ExpenseType;

  @ApiProperty({ example: '120.00' })
  @IsDecimalString()
  amount!: string;

  @ApiProperty({ example: '2026-06-18' })
  @IsISO8601()
  expenseDate!: string;

  @ApiPropertyOptional({
    enum: AllocationType,
    example: AllocationType.IMMEDIATE,
  })
  @IsOptional()
  @IsEnum(AllocationType)
  allocationType?: AllocationType;

  @ApiPropertyOptional({ example: '2026-06-18' })
  @IsOptional()
  @IsISO8601()
  allocationPeriodStart?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsISO8601()
  allocationPeriodEnd?: string;

  @ApiPropertyOptional({ example: '85120.5' })
  @IsOptional()
  @IsDecimalString()
  odometerKm?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    enum: PaymentMethodType,
    example: PaymentMethodType.CARD,
  })
  @IsOptional()
  @IsEnum(PaymentMethodType)
  paymentMethod?: PaymentMethodType;

  @ApiPropertyOptional({ example: 'https://storage.example/receipt.jpg' })
  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @ApiPropertyOptional({ example: 'Otopark ucreti' })
  @IsOptional()
  @IsString()
  note?: string;
}

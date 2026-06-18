import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { IsDecimalString } from '../../common/validators/decimal-string.decorator';

export class CreateRecurringExpenseDto {
  @ApiProperty({ example: 'veh_123' })
  @IsString()
  vehicleId!: string;

  @ApiProperty({ example: 'Trafik sigortasi' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ enum: ExpenseType, example: ExpenseType.FIXED })
  @IsOptional()
  @IsEnum(ExpenseType)
  expenseType?: ExpenseType;

  @ApiProperty({ example: '1200.00' })
  @IsDecimalString()
  amount!: string;

  @ApiProperty({ enum: AllocationType, example: AllocationType.MONTHLY })
  @IsEnum(AllocationType)
  period!: AllocationType;

  @ApiPropertyOptional({
    enum: FixedCostAllocationMethod,
    example: FixedCostAllocationMethod.CALENDAR_DAY
  })
  @IsOptional()
  @IsEnum(FixedCostAllocationMethod)
  allocationMethod?: FixedCostAllocationMethod;

  @ApiProperty({ example: '2026-06-18' })
  @IsISO8601()
  startsAt!: string;

  @ApiPropertyOptional({ example: '2027-06-18' })
  @IsOptional()
  @IsISO8601()
  endsAt?: string;

  @ApiPropertyOptional({ example: '2026-07-18' })
  @IsOptional()
  @IsISO8601()
  nextDueAt?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Yillik sigorta taksidi' })
  @IsOptional()
  @IsString()
  note?: string;
}

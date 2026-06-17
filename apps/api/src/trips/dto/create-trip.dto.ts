import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min
} from 'class-validator';
import { IsDecimalString } from '../../common/validators/decimal-string.decorator';

export class CreateTripDto {
  @ApiProperty({ example: 'veh_123' })
  @IsString()
  vehicleId!: string;

  @ApiPropertyOptional({ example: 'shf_123' })
  @IsOptional()
  @IsString()
  shiftId?: string;

  @ApiProperty({ example: '2026-06-17' })
  @IsISO8601()
  tripDate!: string;

  @ApiPropertyOptional({ example: '2026-06-17T10:15:00+03:00' })
  @IsOptional()
  @IsISO8601()
  startedAt?: string;

  @ApiPropertyOptional({ example: '2026-06-17T10:47:00+03:00' })
  @IsOptional()
  @IsISO8601()
  endedAt?: string;

  @ApiPropertyOptional({ example: 32, minimum: 0, maximum: 1440 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  durationMinutes?: number;

  @ApiProperty({ example: '450.00' })
  @IsDecimalString()
  grossIncome!: string;

  @ApiPropertyOptional({ example: '0.00' })
  @IsOptional()
  @IsDecimalString()
  tipAmount?: string;

  @ApiPropertyOptional({ example: '0.00' })
  @IsOptional()
  @IsDecimalString()
  cancellationIncome?: string;

  @ApiProperty({ enum: PaymentMethodType, example: PaymentMethodType.DIGITAL })
  @IsEnum(PaymentMethodType)
  paymentMethod!: PaymentMethodType;

  @ApiPropertyOptional({ example: 'Kadikoy' })
  @IsOptional()
  @IsString()
  pickupLocation?: string;

  @ApiPropertyOptional({ example: 'Besiktas' })
  @IsOptional()
  @IsString()
  dropoffLocation?: string;

  @ApiPropertyOptional({ example: '18.00' })
  @IsOptional()
  @IsDecimalString()
  tripKm?: string;

  @ApiPropertyOptional({ example: '4.00' })
  @IsOptional()
  @IsDecimalString()
  deadheadKm?: string;

  @ApiPropertyOptional({ example: 'Yogun trafik' })
  @IsOptional()
  @IsString()
  note?: string;
}

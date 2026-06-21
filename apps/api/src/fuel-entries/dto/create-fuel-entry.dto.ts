import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FuelType, PaymentMethodType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString
} from 'class-validator';
import { IsDecimalString } from '../../common/validators/decimal-string.decorator';

export class CreateFuelEntryDto {
  @ApiProperty({ example: 'veh_123' })
  @IsString()
  vehicleId!: string;

  @ApiPropertyOptional({ example: '2026-06-18' })
  @IsOptional()
  @IsISO8601()
  createdAt?: string;

  @ApiProperty({ enum: FuelType, example: FuelType.GASOLINE })
  @IsEnum(FuelType)
  fuelType!: FuelType;

  @ApiProperty({ example: '1500.00' })
  @IsDecimalString()
  amount!: string;

  @ApiProperty({ example: '32.500' })
  @IsDecimalString()
  liters!: string;

  @ApiPropertyOptional({ example: '46.154' })
  @IsOptional()
  @IsDecimalString()
  pricePerLiter?: string;

  @ApiPropertyOptional({ example: '85120.5' })
  @IsOptional()
  @IsDecimalString()
  odometerKm?: string;

  @ApiPropertyOptional({ example: 'Shell Kadikoy' })
  @IsOptional()
  @IsString()
  stationName?: string;

  @ApiPropertyOptional({ example: 'Istanbul' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Kadikoy' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  fullTank?: boolean;

  @ApiPropertyOptional({ example: 'FULL' })
  @IsOptional()
  @IsString()
  tankFillLevel?: string;

  @ApiPropertyOptional({ enum: PaymentMethodType, example: PaymentMethodType.CARD })
  @IsOptional()
  @IsEnum(PaymentMethodType)
  paymentMethod?: PaymentMethodType;

  @ApiPropertyOptional({ example: 'https://storage.example/fuel-receipt.jpg' })
  @IsOptional()
  @IsString()
  receiptUrl?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { AllocationType } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';
import {
  PaginationQueryDto,
  SortDirection
} from '../../common/dto/pagination-query.dto';
import { IsDecimalString } from '../../common/validators/decimal-string.decorator';

export enum MaintenanceEntrySortBy {
  AMOUNT = 'amount',
  COST_PER_KM = 'costPerKm',
  CREATED_AT = 'createdAt',
  MAINTENANCE_DATE = 'maintenanceDate',
  ODOMETER_KM = 'odometerKm'
}

export class ListMaintenanceEntriesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'veh_123' })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional({ example: 'Lastik' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: AllocationType })
  @IsOptional()
  @IsEnum(AllocationType)
  allocationType?: AllocationType;

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-08-31' })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({ example: 'filtre' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: '500.00' })
  @IsOptional()
  @IsDecimalString()
  minAmount?: string;

  @ApiPropertyOptional({ example: '15000.00' })
  @IsOptional()
  @IsDecimalString()
  maxAmount?: string;

  @ApiPropertyOptional({ example: '80000.0' })
  @IsOptional()
  @IsDecimalString()
  minOdometerKm?: string;

  @ApiPropertyOptional({ example: '95000.0' })
  @IsOptional()
  @IsDecimalString()
  maxOdometerKm?: string;

  @ApiPropertyOptional({
    enum: MaintenanceEntrySortBy,
    example: MaintenanceEntrySortBy.MAINTENANCE_DATE
  })
  @IsOptional()
  @IsEnum(MaintenanceEntrySortBy)
  sortBy?: MaintenanceEntrySortBy = MaintenanceEntrySortBy.MAINTENANCE_DATE;

  @ApiPropertyOptional({ enum: SortDirection, example: SortDirection.DESC })
  @IsOptional()
  @IsEnum(SortDirection)
  sortDirection?: SortDirection = SortDirection.DESC;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PackageAllocationMethod } from '@prisma/client';
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

export enum TagPackageSortBy {
  AMOUNT = 'amount',
  CREATED_AT = 'createdAt',
  ENDS_AT = 'endsAt',
  STARTS_AT = 'startsAt'
}

export class ListTagPackagesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'veh_123' })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional({ enum: PackageAllocationMethod })
  @IsOptional()
  @IsEnum(PackageAllocationMethod)
  allocationMethod?: PackageAllocationMethod;

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

  @ApiPropertyOptional({ example: 'haftalik' })
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
    enum: TagPackageSortBy,
    example: TagPackageSortBy.STARTS_AT
  })
  @IsOptional()
  @IsEnum(TagPackageSortBy)
  sortBy?: TagPackageSortBy = TagPackageSortBy.STARTS_AT;

  @ApiPropertyOptional({ enum: SortDirection, example: SortDirection.DESC })
  @IsOptional()
  @IsEnum(SortDirection)
  sortDirection?: SortDirection = SortDirection.DESC;
}

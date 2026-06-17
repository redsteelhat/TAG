import { ApiPropertyOptional } from '@nestjs/swagger';
import { AttachmentType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListAttachmentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AttachmentType })
  @IsOptional()
  @IsEnum(AttachmentType)
  type?: AttachmentType;

  @ApiPropertyOptional({ example: 'trp_123' })
  @IsOptional()
  @IsString()
  tripId?: string;

  @ApiPropertyOptional({ example: 'exp_123' })
  @IsOptional()
  @IsString()
  expenseEntryId?: string;

  @ApiPropertyOptional({ example: 'fuel_123' })
  @IsOptional()
  @IsString()
  fuelEntryId?: string;

  @ApiPropertyOptional({ example: 'mnt_123' })
  @IsOptional()
  @IsString()
  maintenanceEntryId?: string;
}

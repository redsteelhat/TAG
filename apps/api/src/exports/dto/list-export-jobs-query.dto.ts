import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExportFormat, ExportStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListExportJobsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ExportFormat, example: ExportFormat.XLSX })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat;

  @ApiPropertyOptional({ enum: ExportStatus, example: ExportStatus.COMPLETED })
  @IsOptional()
  @IsEnum(ExportStatus)
  status?: ExportStatus;
}

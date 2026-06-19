import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuditLog } from '../audit/audit-log.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateExcelExportDto } from './dto/create-excel-export.dto';
import { ListExportJobsQueryDto } from './dto/list-export-jobs-query.dto';
import { ExportsService } from './exports.service';

@UseGuards(JwtAuthGuard)
@Controller('exports')
@ApiTags('Exports')
@ApiBearerAuth('access-token')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Post('excel')
  @ApiOperation({ summary: 'Create an Excel export for reports and raw data' })
  @AuditLog({
    action: 'export.excel.create',
    entityType: 'export_job',
    entityIdPath: 'data.id'
  })
  async createExcelExport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExcelExportDto
  ) {
    return {
      data: await this.exportsService.createExcelExport(user.id, dto)
    };
  }

  @Post('pdf')
  @ApiOperation({ summary: 'Create a PDF report export' })
  @AuditLog({
    action: 'export.pdf.create',
    entityType: 'export_job',
    entityIdPath: 'data.id'
  })
  async createPdfExport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExcelExportDto
  ) {
    return {
      data: await this.exportsService.createPdfExport(user.id, dto)
    };
  }

  @Get()
  @ApiOperation({ summary: 'List export jobs for the current user' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListExportJobsQueryDto
  ) {
    return await this.exportsService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an export job by id' })
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      data: await this.exportsService.findOne(user.id, id)
    };
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download an export file' })
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response
  ) {
    const file = await this.exportsService.getDownloadStream(user.id, id);

    response.setHeader('Content-Type', file.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName}"`
    );

    return new StreamableFile(file.stream);
  }
}

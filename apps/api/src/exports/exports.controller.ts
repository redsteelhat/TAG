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
@ApiTags('Dışa aktarma')
@ApiBearerAuth('access-token')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Post('excel')
  @ApiOperation({ summary: 'Raporlar ve ham veri için Excel çıktısı oluştur' })
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
  @ApiOperation({ summary: 'PDF rapor çıktısı oluştur' })
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
  @ApiOperation({ summary: 'Geçerli kullanıcının dışa aktarma taleplerini listele' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListExportJobsQueryDto
  ) {
    return await this.exportsService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Dışa aktarma talebini kimlik ile getir' })
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      data: await this.exportsService.findOne(user.id, id)
    };
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Dışa aktarma dosyasını indir' })
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

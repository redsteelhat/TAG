import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import {
  ExportFormat,
  ExportJob,
  ExportStatus,
  NotificationType,
  Prisma
} from '@prisma/client';
import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  buildPaginationMeta,
  getPaginationParams
} from '../common/pagination/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { ReportsService } from '../reports/reports.service';
import {
  CreateExcelExportDto,
  ExcelExportPeriod
} from './dto/create-excel-export.dto';
import { ListExportJobsQueryDto } from './dto/list-export-jobs-query.dto';
import { PdfReportBuilder, PdfReportSection } from './pdf-report.builder';
import {
  WorkbookCell,
  WorkbookSheet,
  XlsxWorkbookBuilder
} from './xlsx-workbook.builder';

interface ExportPeriodRange {
  end: Date;
  endDate: string;
  nextStart: Date;
  start: Date;
  startDate: string;
}

@Injectable()
export class ExportsService {
  private readonly pdfBuilder = new PdfReportBuilder();
  private readonly xlsxBuilder = new XlsxWorkbookBuilder();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly queueService: QueueService,
    private readonly reportsService: ReportsService
  ) {}

  async createExcelExport(userId: string, dto: CreateExcelExportDto) {
    return this.createReportExport(userId, dto, ExportFormat.XLSX);
  }

  async createPdfExport(userId: string, dto: CreateExcelExportDto) {
    return this.createReportExport(userId, dto, ExportFormat.PDF);
  }

  private async createReportExport(
    userId: string,
    dto: CreateExcelExportDto,
    format: ExportFormat
  ) {
    const period = dto.period ?? ExcelExportPeriod.MONTHLY;
    const periodRange = this.resolvePeriodRange(period, dto);
    const exportJob = await this.prisma.exportJob.create({
      data: {
        format,
        period_end: periodRange.end,
        period_start: periodRange.start,
        status: ExportStatus.PENDING,
        user_id: userId
      }
    });

    this.queueService.enqueue(
      'export.report',
      {
        dto,
        exportJobId: exportJob.id,
        format,
        period,
        periodRange,
        userId
      },
      async ({ payload }) => {
        await this.processReportExport(payload);
      }
    );

    return this.toExportJobResponse(exportJob);
  }

  private async processReportExport(input: {
    dto: CreateExcelExportDto;
    exportJobId: string;
    format: ExportFormat;
    period: ExcelExportPeriod;
    periodRange: ExportPeriodRange;
    userId: string;
  }) {
    const { dto, exportJobId, format, period, periodRange, userId } = input;

    try {
      await this.prisma.exportJob.update({
        where: {
          id: exportJobId
        },
        data: {
          status: ExportStatus.PROCESSING
        }
      });

      const file =
        format === ExportFormat.PDF
          ? await this.buildPdfReport(userId, period, periodRange, dto)
          : await this.buildExcelWorkbook(userId, period, periodRange, dto);
      const storageKey = this.buildStorageKey(userId, exportJobId, format);
      const absolutePath = this.resolveStoragePath(storageKey);

      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, file);

      const completedJob = await this.prisma.exportJob.update({
        where: {
          id: exportJobId
        },
        data: {
          completed_at: new Date(),
          file_url: `/exports/${exportJobId}/download`,
          status: ExportStatus.COMPLETED,
          storage_key: storageKey
        }
      });

      await this.notificationsService.createImmediate({
        body: `${periodRange.startDate} - ${periodRange.endDate} donemi ${format} raporun hazır.`,
        metadata: {
          exportJobId: completedJob.id,
          fileUrl: completedJob.file_url,
          format
        },
        title: 'Raporun hazır',
        type: NotificationType.EXPORT_READY,
        userId
      });
    } catch (error) {
      await this.prisma.exportJob.update({
        where: {
          id: exportJobId
        },
        data: {
          error_message:
            error instanceof Error ? error.message : 'Report export failed.',
          status: ExportStatus.FAILED
        }
      });

      throw error instanceof Error
        ? error
        : new InternalServerErrorException('Report export failed.');
    }
  }

  async findAll(userId: string, query: ListExportJobsQueryDto) {
    const pagination = getPaginationParams(query);
    const where: Prisma.ExportJobWhereInput = {
      user_id: userId
    };

    if (query.format) {
      where.format = query.format;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.exportJob.findMany({
        where,
        orderBy: {
          created_at: 'desc'
        },
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.exportJob.count({
        where
      })
    ]);

    return {
      data: items.map((item) => this.toExportJobResponse(item)),
      meta: buildPaginationMeta(pagination, total)
    };
  }

  async findOne(userId: string, id: string) {
    const exportJob = await this.findOwnedExportJob(userId, id);

    return this.toExportJobResponse(exportJob);
  }

  async getDownloadStream(userId: string, id: string) {
    const exportJob = await this.findOwnedExportJob(userId, id);

    if (
      exportJob.status !== ExportStatus.COMPLETED ||
      !exportJob.storage_key
    ) {
      throw new NotFoundException('Dışa aktarma dosyası henüz hazır değil.');
    }

    const absolutePath = this.resolveStoragePath(exportJob.storage_key);

    try {
      await stat(absolutePath);
    } catch {
      throw new NotFoundException('Dışa aktarma dosyası bulunamadı.');
    }

    return {
      fileName: `tag-finans-${exportJob.period_start.toISOString().slice(0, 10)}-${exportJob.period_end.toISOString().slice(0, 10)}.${this.extensionForFormat(exportJob.format)}`,
      mimeType: this.mimeTypeForFormat(exportJob.format),
      stream: createReadStream(absolutePath)
    };
  }

  private async buildExcelWorkbook(
    userId: string,
    period: ExcelExportPeriod,
    periodRange: ExportPeriodRange,
    dto: CreateExcelExportDto
  ) {
    const report = await this.calculateReport(userId, period, dto);
    const sheets: WorkbookSheet[] = [
      {
        name: 'Özet',
        rows: this.buildSummaryRows(period, periodRange, report)
      }
    ];

    if (dto.includeRawData ?? true) {
      const [trips, expenses, fuelEntries, maintenanceEntries] =
        await Promise.all([
          this.findTrips(userId, periodRange, dto.vehicleId),
          this.findExpenses(userId, periodRange, dto.vehicleId),
          this.findFuelEntries(userId, periodRange, dto.vehicleId),
          this.findMaintenanceEntries(userId, periodRange, dto.vehicleId)
        ]);

      sheets.push(
        {
          name: 'Seferler',
          rows: this.buildTripRows(trips)
        },
        {
          name: 'Giderler',
          rows: this.buildExpenseRows(expenses)
        },
        {
          name: 'Yakıt',
          rows: this.buildFuelRows(fuelEntries)
        },
        {
          name: 'Bakım',
          rows: this.buildMaintenanceRows(maintenanceEntries)
        }
      );
    }

    return this.xlsxBuilder.build(sheets);
  }

  private async buildPdfReport(
    userId: string,
    period: ExcelExportPeriod,
    periodRange: ExportPeriodRange,
    dto: CreateExcelExportDto
  ) {
    const report = await this.calculateReport(userId, period, dto);
    const sections: PdfReportSection[] = [
      {
        title: 'Finans Özeti',
        rows: this.buildPdfSummaryRows(report)
      },
      {
        title: 'Maliyet Kirilimi',
        rows: this.buildPdfCostRows(report)
      },
      {
        title: 'Operasyon Metrikleri',
        rows: this.buildPdfOperationRows(report)
      }
    ];

    if (dto.includeRawData ?? true) {
      const trips = await this.findTrips(userId, periodRange, dto.vehicleId);

      sections.push({
        title: 'Son Seferler',
        rows: trips.slice(0, 20).map((trip) => [
          trip.trip_date.toISOString().slice(0, 10),
          `${trip.total_income.toFixed(2)} TL / ${trip.total_km.toFixed(2)} km / net ${trip.true_net_profit.toFixed(2)} TL`
        ])
      });
    }

    return this.pdfBuilder.build({
      sections,
      subtitle: `${periodRange.startDate} - ${periodRange.endDate}`,
      title: 'TAG Sürücü Finans Raporu'
    });
  }

  private calculateReport(
    userId: string,
    period: ExcelExportPeriod,
    dto: CreateExcelExportDto
  ) {
    if (period === ExcelExportPeriod.DAILY) {
      return this.reportsService.calculateDailyProfit(userId, {
        date: dto.date,
        vehicleId: dto.vehicleId
      });
    }

    if (period === ExcelExportPeriod.WEEKLY) {
      return this.reportsService.calculateWeeklyProfit(userId, {
        date: dto.date,
        vehicleId: dto.vehicleId,
        weekStart: dto.weekStart
      });
    }

    return this.reportsService.calculateMonthlyProfit(userId, {
      date: dto.date,
      month: dto.month,
      vehicleId: dto.vehicleId
    });
  }

  private buildSummaryRows(
    period: ExcelExportPeriod,
    periodRange: ExportPeriodRange,
    report: Record<string, unknown>
  ): WorkbookSheet['rows'] {
    return [
      ['TAG Sürücü Finans Raporu'],
      ['Dönem', period],
      ['Başlangıç', periodRange.startDate],
      ['Bitiş', periodRange.endDate],
      [],
      ['Metrik', 'Değer'],
      ['Brüt gelir', this.toCell(report.grossIncome)],
      ['Yakıt maliyeti', this.toCell(report.fuelCost)],
      ['Paket maliyeti', this.toCell(report.tagPackageCost)],
      ['Değişken giderler', this.toCell(report.variableExpenses)],
      ['Sabit giderler', this.toCell(report.fixedExpenses)],
      ['Bakım rezervi', this.toCell(report.maintenanceReserve)],
      ['Amortisman', this.toCell(report.depreciation)],
      ['Toplam maliyet', this.toCell(report.totalCost)],
      ['Net kâr', this.toCell(report.netProfit)],
      ['Km başı kâr', this.toCell(report.kmProfit)],
      ['Saatlik kâr', this.toCell(report.hourlyProfit)],
      ['Toplam km', this.toCell(report.totalKm)],
      ['Aktif dakika', this.toCell(report.activeMinutes)],
      ['Sefer sayısı', this.toCell(report.tripCount)],
      ['Vardiya sayısı', this.toCell(report.shiftCount)],
      ['Hesaplama versiyonu', this.toCell(report.calculationVersion)]
    ];
  }

  private buildPdfSummaryRows(report: Record<string, unknown>) {
    return [
      ['Brüt gelir', this.toCell(report.grossIncome)],
      ['Toplam maliyet', this.toCell(report.totalCost)],
      ['Net kâr', this.toCell(report.netProfit)],
      ['Km başı kâr', this.toCell(report.kmProfit)],
      ['Saatlik kâr', this.toCell(report.hourlyProfit)]
    ] as PdfReportSection['rows'];
  }

  private buildPdfCostRows(report: Record<string, unknown>) {
    return [
      ['Yakıt maliyeti', this.toCell(report.fuelCost)],
      ['Paket maliyeti', this.toCell(report.tagPackageCost)],
      ['Değişken giderler', this.toCell(report.variableExpenses)],
      ['Sabit giderler', this.toCell(report.fixedExpenses)],
      ['Bakım rezervi', this.toCell(report.maintenanceReserve)],
      ['Amortisman', this.toCell(report.depreciation)]
    ] as PdfReportSection['rows'];
  }

  private buildPdfOperationRows(report: Record<string, unknown>) {
    return [
      ['Toplam km', this.toCell(report.totalKm)],
      ['Aktif dakika', this.toCell(report.activeMinutes)],
      ['Sefer sayısı', this.toCell(report.tripCount)],
      ['Vardiya sayısı', this.toCell(report.shiftCount)],
      ['Hesaplama versiyonu', this.toCell(report.calculationVersion)]
    ] as PdfReportSection['rows'];
  }

  private buildTripRows(trips: Awaited<ReturnType<ExportsService['findTrips']>>) {
    return [
      [
        'Tarih',
        'Başlangıç',
        'Bitiş',
        'Brüt gelir',
        'Bahşiş',
        'İptal geliri',
        'Toplam gelir',
        'Ödeme',
        'Sefer km',
        'Boş km',
        'Toplam km',
        'Yakıt',
        'Paket',
        'Sabit',
        'Bakım',
        'Amortisman',
        'Net kâr',
        'Not'
      ],
      ...trips.map((trip) => [
        trip.trip_date,
        trip.started_at,
        trip.ended_at,
        trip.gross_income.toFixed(2),
        trip.tip_amount.toFixed(2),
        trip.cancellation_income.toFixed(2),
        trip.total_income.toFixed(2),
        trip.payment_method,
        trip.trip_km.toFixed(2),
        trip.deadhead_km.toFixed(2),
        trip.total_km.toFixed(2),
        trip.estimated_fuel_cost.toFixed(2),
        trip.allocated_package_cost.toFixed(2),
        trip.allocated_fixed_cost.toFixed(2),
        trip.allocated_maintenance_cost.toFixed(2),
        trip.allocated_depreciation_cost.toFixed(2),
        trip.true_net_profit.toFixed(2),
        trip.note
      ])
    ];
  }

  private buildExpenseRows(
    expenses: Awaited<ReturnType<ExportsService['findExpenses']>>
  ) {
    return [
      [
        'Tarih',
        'Tip',
        'Kategöri',
        'Tutar',
        'Dağıtım',
        'Ödeme',
        'Km sayacı',
        'Tekrarlayan',
        'Not'
      ],
      ...expenses.map((expense) => [
        expense.expense_date,
        expense.expense_type,
        expense.category?.name,
        expense.amount.toFixed(2),
        expense.allocation_type,
        expense.payment_method,
        expense.odometer_km?.toFixed(1),
        expense.is_recurring,
        expense.note
      ])
    ];
  }

  private buildFuelRows(
    fuelEntries: Awaited<ReturnType<ExportsService['findFuelEntries']>>
  ) {
    return [
      [
        'Tarih',
        'Yakıt tipi',
        'Tutar',
        'Litre',
        'Litre fiyati',
        'Km sayacı',
        'Full depo',
        'İstasyon',
        'Şehir',
        'Ilce',
        'Ödeme'
      ],
      ...fuelEntries.map((fuel) => [
        fuel.created_at,
        fuel.fuel_type,
        fuel.amount.toFixed(2),
        fuel.liters.toFixed(3),
        fuel.price_per_liter.toFixed(3),
        fuel.odometer_km?.toFixed(1),
        fuel.full_tank,
        fuel.station_name,
        fuel.city,
        fuel.district,
        fuel.payment_method
      ])
    ];
  }

  private buildMaintenanceRows(
    maintenanceEntries: Awaited<
      ReturnType<ExportsService['findMaintenanceEntries']>
    >
  ) {
    return [
      [
        'Tarih',
        'Kategöri',
        'Baslik',
        'Tutar',
        'Km sayacı',
        'Beklenen aralik km',
        'Km başı maliyet',
        'Servis',
        'Dağıtım',
        'Not'
      ],
      ...maintenanceEntries.map((maintenance) => [
        maintenance.maintenance_date,
        maintenance.category,
        maintenance.title,
        maintenance.amount.toFixed(2),
        maintenance.odometer_km?.toFixed(1),
        maintenance.expected_interval_km?.toFixed(1),
        maintenance.cost_per_km?.toFixed(4),
        maintenance.service_name,
        maintenance.allocation_type,
        maintenance.note
      ])
    ];
  }

  private findTrips(
    userId: string,
    periodRange: ExportPeriodRange,
    vehicleId?: string
  ) {
    return this.prisma.trip.findMany({
      where: {
        user_id: userId,
        vehicle_id: vehicleId,
        deleted_at: null,
        trip_date: {
          gte: periodRange.start,
          lt: periodRange.nextStart
        }
      },
      orderBy: {
        trip_date: 'asc'
      }
    });
  }

  private findExpenses(
    userId: string,
    periodRange: ExportPeriodRange,
    vehicleId?: string
  ) {
    return this.prisma.expenseEntry.findMany({
      where: {
        user_id: userId,
        vehicle_id: vehicleId,
        deleted_at: null,
        expense_date: {
          gte: periodRange.start,
          lt: periodRange.nextStart
        }
      },
      include: {
        category: true
      },
      orderBy: {
        expense_date: 'asc'
      }
    });
  }

  private findFuelEntries(
    userId: string,
    periodRange: ExportPeriodRange,
    vehicleId?: string
  ) {
    return this.prisma.fuelEntry.findMany({
      where: {
        user_id: userId,
        vehicle_id: vehicleId,
        deleted_at: null,
        created_at: {
          gte: periodRange.start,
          lt: periodRange.nextStart
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    });
  }

  private findMaintenanceEntries(
    userId: string,
    periodRange: ExportPeriodRange,
    vehicleId?: string
  ) {
    return this.prisma.maintenanceEntry.findMany({
      where: {
        user_id: userId,
        vehicle_id: vehicleId,
        deleted_at: null,
        maintenance_date: {
          gte: periodRange.start,
          lt: periodRange.nextStart
        }
      },
      orderBy: {
        maintenance_date: 'asc'
      }
    });
  }

  private async findOwnedExportJob(userId: string, id: string) {
    const exportJob = await this.prisma.exportJob.findFirst({
      where: {
        id,
        user_id: userId
      }
    });

    if (!exportJob) {
      throw new NotFoundException('Dışa aktarma talebi bulunamadı.');
    }

    return exportJob;
  }

  private resolvePeriodRange(
    period: ExcelExportPeriod,
    dto: CreateExcelExportDto
  ): ExportPeriodRange {
    if (period === ExcelExportPeriod.DAILY) {
      const start = this.startOfUtcDay(this.parseDate(dto.date));
      const nextStart = new Date(start);

      nextStart.setUTCDate(nextStart.getUTCDate() + 1);

      return this.toPeriodRange(start, nextStart);
    }

    if (period === ExcelExportPeriod.WEEKLY) {
      const date = this.startOfUtcDay(this.parseDate(dto.weekStart ?? dto.date));
      const start = new Date(date);

      if (!dto.weekStart) {
        start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
      }

      const nextStart = new Date(start);

      nextStart.setUTCDate(nextStart.getUTCDate() + 7);

      return this.toPeriodRange(start, nextStart);
    }

    const date = dto.month?.match(/^\d{4}-\d{2}$/)
      ? this.parseDate(`${dto.month}-01`)
      : this.parseDate(dto.date);
    const start = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
    );
    const nextStart = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)
    );

    return this.toPeriodRange(start, nextStart);
  }

  private toPeriodRange(start: Date, nextStart: Date): ExportPeriodRange {
    const end = new Date(nextStart);

    end.setUTCDate(end.getUTCDate() - 1);

    return {
      end,
      endDate: end.toISOString().slice(0, 10),
      nextStart,
      start,
      startDate: start.toISOString().slice(0, 10)
    };
  }

  private parseDate(dateValue?: string) {
    const date = dateValue ? new Date(dateValue) : new Date();

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid export date value.');
    }

    return date;
  }

  private startOfUtcDay(date: Date) {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    );
  }

  private toCell(value: unknown): WorkbookCell {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value instanceof Date ||
      value === null ||
      value === undefined
    ) {
      return value;
    }

    return String(value);
  }

  private buildStorageKey(
    userId: string,
    exportJobId: string,
    format: ExportFormat
  ) {
    return path.posix.join(
      'exports',
      userId,
      `${exportJobId}.${this.extensionForFormat(format)}`
    );
  }

  private extensionForFormat(format: ExportFormat) {
    return format === ExportFormat.PDF ? 'pdf' : 'xlsx';
  }

  private mimeTypeForFormat(format: ExportFormat) {
    return format === ExportFormat.PDF
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }

  private resolveStoragePath(storageKey: string) {
    return path.join(this.resolveApiRoot(), 'storage', storageKey);
  }

  private resolveApiRoot() {
    const cwd = process.cwd();

    if (path.basename(cwd) === 'api' && path.basename(path.dirname(cwd)) === 'apps') {
      return cwd;
    }

    return path.join(cwd, 'apps', 'api');
  }

  private toExportJobResponse(exportJob: ExportJob) {
    return {
      id: exportJob.id,
      format: exportJob.format,
      status: exportJob.status,
      periodStart: exportJob.period_start,
      periodEnd: exportJob.period_end,
      fileUrl: exportJob.file_url,
      errorMessage: exportJob.error_message,
      createdAt: exportJob.created_at,
      updatedAt: exportJob.updated_at,
      completedAt: exportJob.completed_at
    };
  }
}

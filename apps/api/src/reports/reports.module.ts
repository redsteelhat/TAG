import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportCacheService } from './report-cache.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ReportsController],
  providers: [ReportCacheService, ReportsService],
  exports: [ReportCacheService, ReportsService]
})
export class ReportsModule {}

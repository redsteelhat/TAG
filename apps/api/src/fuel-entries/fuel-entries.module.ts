import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportsModule } from '../reports/reports.module';
import { FuelEntriesController } from './fuel-entries.controller';
import { FuelEntriesService } from './fuel-entries.service';

@Module({
  imports: [AuthModule, PrismaModule, ReportsModule],
  controllers: [FuelEntriesController],
  providers: [FuelEntriesService],
  exports: [FuelEntriesService]
})
export class FuelEntriesModule {}

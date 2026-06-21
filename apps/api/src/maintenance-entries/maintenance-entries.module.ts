import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ReportsModule } from "../reports/reports.module";
import { MaintenanceEntriesController } from "./maintenance-entries.controller";
import { MaintenanceEntriesService } from "./maintenance-entries.service";

@Module({
  imports: [AuthModule, PrismaModule, ReportsModule],
  controllers: [MaintenanceEntriesController],
  providers: [MaintenanceEntriesService],
  exports: [MaintenanceEntriesService],
})
export class MaintenanceEntriesModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HealthModule } from '../health/health.module';
import { MonitoringController } from './monitoring.controller';
import { MonitoringGuard } from './monitoring.guard';

@Module({
  imports: [AuthModule, HealthModule],
  controllers: [MonitoringController],
  providers: [MonitoringGuard]
})
export class MonitoringModule {}

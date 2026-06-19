import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { QueueModule } from '../queue/queue.module';
import { ReportsModule } from '../reports/reports.module';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';

@Module({
  imports: [AuthModule, NotificationsModule, QueueModule, ReportsModule],
  controllers: [ExportsController],
  providers: [ExportsService]
})
export class ExportsModule {}

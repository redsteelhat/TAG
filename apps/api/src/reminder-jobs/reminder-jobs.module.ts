import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReminderJobsService } from './reminder-jobs.service';

@Module({
  imports: [NotificationsModule],
  providers: [ReminderJobsService],
  exports: [ReminderJobsService]
})
export class ReminderJobsModule {}

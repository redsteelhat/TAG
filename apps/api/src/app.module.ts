import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AttachmentsModule } from './attachments/attachments.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ErrorTrackingModule } from './error-tracking/error-tracking.module';
import { ExportsModule } from './exports/exports.module';
import { ExpensesModule } from './expenses/expenses.module';
import { FuelEntriesModule } from './fuel-entries/fuel-entries.module';
import { HealthModule } from './health/health.module';
import { MaintenanceEntriesModule } from './maintenance-entries/maintenance-entries.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { PrivacyModule } from './privacy/privacy.module';
import { ProfileModule } from './profile/profile.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { RecurringExpensesModule } from './recurring-expenses/recurring-expenses.module';
import { ReminderJobsModule } from './reminder-jobs/reminder-jobs.module';
import { ReportsModule } from './reports/reports.module';
import { ShiftsModule } from './shifts/shifts.module';
import { TagPackagesModule } from './tag-packages/tag-packages.module';
import { TripsModule } from './trips/trips.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env']
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: configService.get<number>('RATE_LIMIT_TTL_MS', 60000),
            limit: configService.get<number>('RATE_LIMIT_MAX', 120)
          }
        ],
        errorMessage: 'Too many requests. Please try again later.'
      })
    }),
    AuditModule,
    ErrorTrackingModule,
    PrismaModule,
    AuthModule,
    AttachmentsModule,
    CategoriesModule,
    ExportsModule,
    ProfileModule,
    PrivacyModule,
    QueueModule,
    PaymentMethodsModule,
    VehiclesModule,
    ShiftsModule,
    TripsModule,
    ExpensesModule,
    FuelEntriesModule,
    MaintenanceEntriesModule,
    MonitoringModule,
    NotificationsModule,
    TagPackagesModule,
    RecurringExpensesModule,
    ReminderJobsModule,
    ReportsModule,
    HealthModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}

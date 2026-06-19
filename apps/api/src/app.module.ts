import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AttachmentsModule } from './attachments/attachments.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ExpensesModule } from './expenses/expenses.module';
import { FuelEntriesModule } from './fuel-entries/fuel-entries.module';
import { HealthModule } from './health/health.module';
import { MaintenanceEntriesModule } from './maintenance-entries/maintenance-entries.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { ProfileModule } from './profile/profile.module';
import { PrismaModule } from './prisma/prisma.module';
import { RecurringExpensesModule } from './recurring-expenses/recurring-expenses.module';
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
    PrismaModule,
    AuthModule,
    AttachmentsModule,
    CategoriesModule,
    ProfileModule,
    PaymentMethodsModule,
    VehiclesModule,
    ShiftsModule,
    TripsModule,
    ExpensesModule,
    FuelEntriesModule,
    MaintenanceEntriesModule,
    TagPackagesModule,
    RecurringExpensesModule,
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

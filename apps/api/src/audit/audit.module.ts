import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { AuditService } from './audit.service';

@Module({
  imports: [PrismaModule],
  providers: [
    AuditService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor
    }
  ],
  exports: [AuditService]
})
export class AuditModule {}

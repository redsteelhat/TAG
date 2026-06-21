import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';

type ComponentStatus = 'ok' | 'degraded';

@Injectable()
export class HealthService {
  private readonly startedAt = new Date();

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService
  ) {}

  getHealth() {
    return {
      status: 'ok',
      service: 'tag-api',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString()
    };
  }

  getLiveness() {
    return {
      ...this.getHealth(),
      startedAt: this.startedAt.toISOString()
    };
  }

  async getReadiness() {
    const database = await this.checkDatabase();
    const queue = this.getQueueCheck();
    const status: ComponentStatus =
      database.status === 'ok' && queue.status === 'ok' ? 'ok' : 'degraded';

    return {
      status,
      service: 'tag-api',
      timestamp: new Date().toISOString(),
      checks: {
        database,
        queue
      }
    };
  }

  async getRuntimeMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const readiness = await this.getReadiness();

    return {
      status: readiness.status,
      service: 'tag-api',
      timestamp: new Date().toISOString(),
      runtime: {
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
        uptimeSeconds: Math.round(process.uptime()),
        startedAt: this.startedAt.toISOString()
      },
      memory: {
        rssBytes: memoryUsage.rss,
        heapTotalBytes: memoryUsage.heapTotal,
        heapUsedBytes: memoryUsage.heapUsed,
        externalBytes: memoryUsage.external,
        arrayBuffersBytes: memoryUsage.arrayBuffers
      },
      cpu: {
        userMicros: cpuUsage.user,
        systemMicros: cpuUsage.system
      },
      checks: readiness.checks
    };
  }

  private async checkDatabase() {
    const startedAt = performance.now();

    try {
      await this.prisma.$queryRaw(Prisma.sql`SELECT 1`);

      return {
        status: 'ok' as const,
        latencyMs: Math.round(performance.now() - startedAt)
      };
    } catch {
      return {
        status: 'degraded' as const,
        latencyMs: Math.round(performance.now() - startedAt)
      };
    }
  }

  private getQueueCheck() {
    const stats = this.queueService.getStats();

    return {
      status: 'ok' as const,
      activeCount: stats.activeCount,
      failedCount: stats.counts.FAILED,
      pendingCount: stats.pendingCount,
      totalCount: stats.totalCount,
      counts: stats.counts
    };
  }
}

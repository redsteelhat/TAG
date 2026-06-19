import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type QueueJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface QueueJob<TPayload = unknown> {
  attempts: number;
  createdAt: Date;
  errorMessage?: string;
  id: string;
  name: string;
  payload: TPayload;
  processedAt?: Date;
  status: QueueJobStatus;
}

type QueueHandler<TPayload> = (job: QueueJob<TPayload>) => Promise<void>;

interface PendingQueueItem<TPayload> {
  handler: QueueHandler<TPayload>;
  job: QueueJob<TPayload>;
}

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly concurrency: number;
  private readonly maxAttempts: number;
  private activeCount = 0;
  private isStopped = false;
  private readonly pendingItems: Array<PendingQueueItem<unknown>> = [];
  private readonly jobs = new Map<string, QueueJob>();

  constructor(configService: ConfigService) {
    this.concurrency = this.getPositiveNumber(
      configService.get<string | number>('QUEUE_CONCURRENCY', 2),
      2
    );
    this.maxAttempts = this.getPositiveNumber(
      configService.get<string | number>('QUEUE_MAX_ATTEMPTS', 3),
      3
    );
  }

  enqueue<TPayload>(
    name: string,
    payload: TPayload,
    handler: QueueHandler<TPayload>
  ) {
    const job: QueueJob<TPayload> = {
      attempts: 0,
      createdAt: new Date(),
      id: this.createJobId(name),
      name,
      payload,
      status: 'PENDING'
    };

    this.jobs.set(job.id, job as QueueJob);
    this.pendingItems.push({
      handler: handler as QueueHandler<unknown>,
      job: job as QueueJob<unknown>
    });
    this.scheduleDrain();

    return job;
  }

  getStats() {
    const counts: Record<QueueJobStatus, number> = {
      COMPLETED: 0,
      FAILED: 0,
      PENDING: 0,
      PROCESSING: 0
    };

    for (const job of this.jobs.values()) {
      counts[job.status] += 1;
    }

    return {
      activeCount: this.activeCount,
      concurrency: this.concurrency,
      maxAttempts: this.maxAttempts,
      pendingCount: this.pendingItems.length,
      totalCount: this.jobs.size,
      counts
    };
  }

  onModuleDestroy() {
    this.isStopped = true;
    this.pendingItems.length = 0;
  }

  private scheduleDrain() {
    setImmediate(() => {
      void this.drain();
    });
  }

  private async drain() {
    if (this.isStopped) {
      return;
    }

    while (this.activeCount < this.concurrency && this.pendingItems.length > 0) {
      const item = this.pendingItems.shift();

      if (!item) {
        return;
      }

      this.activeCount += 1;
      void this.processItem(item).finally(() => {
        this.activeCount -= 1;
        this.scheduleDrain();
      });
    }
  }

  private async processItem(item: PendingQueueItem<unknown>) {
    const { handler, job } = item;

    job.status = 'PROCESSING';
    job.attempts += 1;

    try {
      await handler(job);
      job.status = 'COMPLETED';
      job.processedAt = new Date();
      job.errorMessage = undefined;
    } catch (error) {
      job.errorMessage =
        error instanceof Error ? error.message : 'Queue job failed.';

      if (job.attempts < this.maxAttempts && !this.isStopped) {
        job.status = 'PENDING';
        this.pendingItems.push(item);
        return;
      }

      job.status = 'FAILED';
      job.processedAt = new Date();
      this.logger.error(`${job.name} failed: ${job.errorMessage}`);
    }
  }

  private createJobId(name: string) {
    return `${name}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
  }

  private getPositiveNumber(value: string | number | undefined, fallback: number) {
    const parsed = Number(value);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}

import { Injectable } from '@nestjs/common';

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

@Injectable()
export class ReportCacheService {
  private readonly maxEntries = 500;
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  async getOrSet<T>(
    key: string,
    ttlMs: number,
    factory: () => Promise<T>
  ): Promise<T> {
    const cached = this.get<T>(key);

    if (cached !== undefined) {
      return cached;
    }

    if (ttlMs <= 0) {
      return factory();
    }

    const value = await factory();
    this.pruneExpired();
    this.enforceMaxEntries();
    this.cache.set(key, {
      expiresAt: Date.now() + ttlMs,
      value
    });

    return value;
  }

  deleteByPrefix(prefix: string) {
    let deletedCount = 0;

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        deletedCount += 1;
      }
    }

    return deletedCount;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    this.pruneExpired();
    return this.cache.size;
  }

  private get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  private pruneExpired() {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  private enforceMaxEntries() {
    if (this.cache.size < this.maxEntries) {
      return;
    }

    const oldestKey = this.cache.keys().next().value;

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

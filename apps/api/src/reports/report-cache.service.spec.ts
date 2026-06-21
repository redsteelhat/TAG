import { ReportCacheService } from './report-cache.service';

describe('ReportCacheService', () => {
  it('returns cached value within TTL', async () => {
    const cache = new ReportCacheService();
    const factory = jest.fn().mockResolvedValue({ netProfit: '100.00' });

    const first = await cache.getOrSet('reports:user:daily', 1_000, factory);
    const second = await cache.getOrSet('reports:user:daily', 1_000, factory);

    expect(first).toBe(second);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(cache.size()).toBe(1);
  });

  it('does not cache failed factory calls', async () => {
    const cache = new ReportCacheService();
    const factory = jest
      .fn()
      .mockRejectedValueOnce(new Error('calculation failed'))
      .mockResolvedValueOnce({ netProfit: '120.00' });

    await expect(
      cache.getOrSet('reports:user:daily', 1_000, factory)
    ).rejects.toThrow('calculation failed');
    const value = await cache.getOrSet('reports:user:daily', 1_000, factory);

    expect(value).toEqual({ netProfit: '120.00' });
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('deletes cached reports by prefix', async () => {
    const cache = new ReportCacheService();

    await cache.getOrSet('reports:v1:user_1:daily', 1_000, async () => 1);
    await cache.getOrSet('reports:v1:user_1:weekly', 1_000, async () => 2);
    await cache.getOrSet('reports:v1:user_2:daily', 1_000, async () => 3);

    expect(cache.deleteByPrefix('reports:v1:user_1')).toBe(2);
    expect(cache.size()).toBe(1);
  });

  it('deletes cached reports by user id across report versions', async () => {
    const cache = new ReportCacheService();

    await cache.getOrSet('reports:v1:user_1:daily', 1_000, async () => 1);
    await cache.getOrSet('reports:v2:user_1:overview', 1_000, async () => 2);
    await cache.getOrSet('reports:v1:user_2:daily', 1_000, async () => 3);

    expect(cache.deleteByUser('user_1')).toBe(2);
    expect(cache.size()).toBe(1);
  });
});

import { BadRequestException } from '@nestjs/common';
import { buildDateRangeFilter } from './date-range';

describe('date range helpers', () => {
  it('expands date-only end dates to the end of day', () => {
    const range = buildDateRangeFilter({
      endDate: '2026-06-17',
      startDate: '2026-06-01'
    });

    expect(range?.gte?.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    expect(range?.lte?.toISOString()).toBe('2026-06-17T23:59:59.999Z');
  });

  it('rejects inverted ranges', () => {
    expect(() =>
      buildDateRangeFilter({
        endDate: '2026-06-01',
        startDate: '2026-06-17'
      })
    ).toThrow(BadRequestException);
  });
});

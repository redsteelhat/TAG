import { BadRequestException } from '@nestjs/common';
import { PackageAllocationMethod, Prisma } from '@prisma/client';
import { TagPackagesService } from './tag-packages.service';

describe('TagPackagesService', () => {
  it('maps tag package responses with daily cost', () => {
    const service = new TagPackagesService({} as never);
    const response = (
      service as unknown as {
        toTagPackageResponse(tagPackage: Record<string, unknown>): {
          amount: string;
          dailyCost: string;
          durationDays: number;
        };
      }
    ).toTagPackageResponse({
      allocation_method: PackageAllocationMethod.PER_DAY,
      amount: new Prisma.Decimal('700'),
      break_even_target: new Prisma.Decimal('1240'),
      created_at: new Date('2026-06-18T07:00:00.000Z'),
      duration_days: 7,
      ends_at: new Date('2026-06-24T00:00:00.000Z'),
      id: 'pkg_1',
      is_active: true,
      name: 'Haftalik TAG paketi',
      note: null,
      starts_at: new Date('2026-06-18T00:00:00.000Z'),
      updated_at: new Date('2026-06-18T07:00:00.000Z'),
      user_id: 'user_1',
      vehicle_id: 'vehicle_1'
    });

    expect(response.amount).toBe('700.00');
    expect(response.durationDays).toBe(7);
    expect(response.dailyCost).toBe('100.00');
  });

  it('calculates inclusive duration days', () => {
    const service = new TagPackagesService({} as never);
    const durationDays = (
      service as unknown as {
        resolveDurationDays(startsAt: Date, endsAt: Date): number;
      }
    ).resolveDurationDays(
      new Date('2026-06-18T00:00:00.000Z'),
      new Date('2026-06-24T00:00:00.000Z')
    );

    expect(durationDays).toBe(7);
  });

  it('rejects invalid package date ranges', () => {
    const service = new TagPackagesService({} as never);

    expect(() =>
      (
        service as unknown as {
          resolveDurationDays(startsAt: Date, endsAt: Date): number;
        }
      ).resolveDurationDays(
        new Date('2026-06-24T00:00:00.000Z'),
        new Date('2026-06-18T00:00:00.000Z')
      )
    ).toThrow(BadRequestException);
  });
});

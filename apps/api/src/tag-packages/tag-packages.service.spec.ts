import { BadRequestException } from '@nestjs/common';
import { PackageAllocationMethod, Prisma } from '@prisma/client';
import { TagPackagesService } from './tag-packages.service';

describe('TagPackagesService', () => {
  it('creates a package with allocation method and invalidates report cache', async () => {
    const createdPackage = {
      allocation_method: PackageAllocationMethod.PER_ACTIVE_DAY,
      amount: new Prisma.Decimal('700'),
      break_even_target: new Prisma.Decimal('420'),
      created_at: new Date('2026-06-18T07:00:00.000Z'),
      deleted_at: null,
      duration_days: 7,
      ends_at: new Date('2026-06-24T00:00:00.000Z'),
      id: 'pkg_1',
      is_active: true,
      name: 'Haftalık operasyon paketi',
      note: null,
      starts_at: new Date('2026-06-18T00:00:00.000Z'),
      updated_at: new Date('2026-06-18T07:00:00.000Z'),
      user_id: 'user_1',
      vehicle_id: 'vehicle_1'
    };
    const prisma = {
      tagPackage: {
        create: jest.fn().mockResolvedValue(createdPackage)
      },
      vehicle: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'vehicle_1',
          user_id: 'user_1'
        })
      }
    };
    const reportCache = {
      deleteByUser: jest.fn()
    };
    const service = new TagPackagesService(
      prisma as never,
      reportCache as never
    );

    const response = await service.create('user_1', {
      allocationMethod: PackageAllocationMethod.PER_ACTIVE_DAY,
      amount: '700.00',
      breakEvenTarget: '420.00',
      endsAt: '2026-06-24',
      name: 'Haftalık operasyon paketi',
      startsAt: '2026-06-18',
      vehicleId: 'vehicle_1'
    });

    expect(prisma.tagPackage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          allocation_method: PackageAllocationMethod.PER_ACTIVE_DAY,
          duration_days: 7
        })
      })
    );
    expect(reportCache.deleteByUser).toHaveBeenCalledWith('user_1');
    expect(response.breakEvenTarget).toBe('420.00');
  });

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
      name: 'Haftalık operasyon paketi',
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

  it('rejects zero package amount', async () => {
    const service = new TagPackagesService({
      vehicle: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'vehicle_1',
          user_id: 'user_1'
        })
      }
    } as never);

    await expect(
      service.create('user_1', {
        allocationMethod: PackageAllocationMethod.PER_DAY,
        amount: '0',
        endsAt: '2026-06-24',
        name: 'Çalışma paketi',
        startsAt: '2026-06-18',
        vehicleId: 'vehicle_1'
      })
    ).rejects.toThrow(BadRequestException);
  });
});

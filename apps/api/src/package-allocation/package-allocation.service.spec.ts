import { PackageAllocationMethod, Prisma, TagPackage } from '@prisma/client';
import { PackageAllocationService } from './package-allocation.service';

function buildTagPackage(
  overrides: Partial<TagPackage> = {}
): TagPackage {
  return {
    allocation_method: PackageAllocationMethod.PER_DAY,
    amount: new Prisma.Decimal('700'),
    break_even_target: null,
    created_at: new Date('2026-06-18T07:00:00.000Z'),
    deleted_at: null,
    duration_days: 7,
    ends_at: new Date('2026-06-24T00:00:00.000Z'),
    id: 'pkg_1',
    is_active: true,
    name: 'Haftalik paket',
    note: null,
    starts_at: new Date('2026-06-18T00:00:00.000Z'),
    updated_at: new Date('2026-06-18T07:00:00.000Z'),
    user_id: 'user_1',
    vehicle_id: 'vehicle_1',
    ...overrides
  };
}

describe('PackageAllocationService', () => {
  it('allocates package cost per day', async () => {
    const service = new PackageAllocationService({
      tagPackage: {
        findMany: jest.fn().mockResolvedValue([buildTagPackage()])
      },
      trip: {
        count: jest.fn().mockResolvedValue(0)
      }
    } as never);

    const result = await service.calculateTripPackageCost({
      totalKm: new Prisma.Decimal('22'),
      tripDate: new Date('2026-06-18T10:00:00.000Z'),
      userId: 'user_1',
      vehicleId: 'vehicle_1'
    });

    expect(result.totalAllocatedPackageCost.toFixed(2)).toBe('100.00');
    expect(result.allocationLines[0].rate.toFixed(2)).toBe('100.00');
  });

  it('splits daily package cost across trips on the same day', async () => {
    const service = new PackageAllocationService({
      tagPackage: {
        findMany: jest.fn().mockResolvedValue([buildTagPackage()])
      },
      trip: {
        count: jest.fn().mockResolvedValue(1)
      }
    } as never);

    const result = await service.calculateTripPackageCost({
      totalKm: new Prisma.Decimal('22'),
      tripDate: new Date('2026-06-18T10:00:00.000Z'),
      userId: 'user_1',
      vehicleId: 'vehicle_1'
    });

    expect(result.totalAllocatedPackageCost.toFixed(2)).toBe('50.00');
  });

  it('allocates package cost per active day', async () => {
    const service = new PackageAllocationService({
      tagPackage: {
        findMany: jest.fn().mockResolvedValue([
          buildTagPackage({
            allocation_method: PackageAllocationMethod.PER_ACTIVE_DAY
          })
        ])
      },
      trip: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([
          { trip_date: new Date('2026-06-18T00:00:00.000Z') },
          { trip_date: new Date('2026-06-19T00:00:00.000Z') }
        ])
      },
      shift: {
        findMany: jest.fn().mockResolvedValue([])
      }
    } as never);

    const result = await service.calculateTripPackageCost({
      totalKm: new Prisma.Decimal('22'),
      tripDate: new Date('2026-06-20T10:00:00.000Z'),
      userId: 'user_1',
      vehicleId: 'vehicle_1'
    });

    expect(result.totalAllocatedPackageCost.toFixed(2)).toBe('233.33');
  });

  it('allocates direct package expense only on the package start day', async () => {
    const service = new PackageAllocationService({
      tagPackage: {
        findMany: jest.fn().mockResolvedValue([
          buildTagPackage({
            allocation_method: PackageAllocationMethod.DIRECT_EXPENSE
          })
        ])
      },
      trip: {
        count: jest.fn().mockResolvedValue(0)
      }
    } as never);

    const result = await service.calculateTripPackageCost({
      totalKm: new Prisma.Decimal('22'),
      tripDate: new Date('2026-06-18T10:00:00.000Z'),
      userId: 'user_1',
      vehicleId: 'vehicle_1'
    });

    expect(result.totalAllocatedPackageCost.toFixed(2)).toBe('700.00');
  });

  it('allocates package cost per trip including the current trip', async () => {
    const service = new PackageAllocationService({
      tagPackage: {
        findMany: jest.fn().mockResolvedValue([
          buildTagPackage({
            allocation_method: PackageAllocationMethod.PER_TRIP
          })
        ])
      },
      trip: {
        count: jest.fn().mockResolvedValue(6)
      }
    } as never);

    const result = await service.calculateTripPackageCost({
      totalKm: new Prisma.Decimal('22'),
      tripDate: new Date('2026-06-18T10:00:00.000Z'),
      userId: 'user_1',
      vehicleId: 'vehicle_1'
    });

    expect(result.totalAllocatedPackageCost.toFixed(2)).toBe('100.00');
  });

  it('allocates package cost per km including the current trip km', async () => {
    const service = new PackageAllocationService({
      tagPackage: {
        findMany: jest.fn().mockResolvedValue([
          buildTagPackage({
            allocation_method: PackageAllocationMethod.PER_KM
          })
        ])
      },
      trip: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: {
            total_km: new Prisma.Decimal('118')
          }
        })
      }
    } as never);

    const result = await service.calculateTripPackageCost({
      totalKm: new Prisma.Decimal('22'),
      tripDate: new Date('2026-06-18T10:00:00.000Z'),
      userId: 'user_1',
      vehicleId: 'vehicle_1'
    });

    expect(result.allocationLines[0].rate.toFixed(2)).toBe('5.00');
    expect(result.totalAllocatedPackageCost.toFixed(2)).toBe('110.00');
  });

  it('builds package allocation breakdown', async () => {
    const service = new PackageAllocationService({
      tagPackage: {
        findMany: jest.fn().mockResolvedValue([buildTagPackage()])
      },
      trip: {
        count: jest.fn().mockResolvedValue(0)
      }
    } as never);
    const result = await service.calculateTripPackageCost({
      totalKm: new Prisma.Decimal('22'),
      tripDate: new Date('2026-06-18T10:00:00.000Z'),
      userId: 'user_1',
      vehicleId: 'vehicle_1'
    });
    const breakdown = service.buildPackageAllocationBreakdown(result);

    expect(breakdown.totalAllocatedPackageCost).toBe('100.00');
    expect(breakdown.lines[0].allocationMethod).toBe(
      PackageAllocationMethod.PER_DAY
    );
    expect(breakdown.calculationVersion).toBe('package-allocation-v1');
  });
});

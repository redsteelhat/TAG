import { BadRequestException } from '@nestjs/common';
import { Prisma, Vehicle } from '@prisma/client';
import { IncomeCalculationService } from './income-calculation.service';

const vehicle = {
  average_consumption_l_per_100km: new Prisma.Decimal('7.5'),
  id: 'vehicle_1'
} as Vehicle;

describe('IncomeCalculationService', () => {
  it('calculates trip income, km, duration and fuel cost', async () => {
    const service = new IncomeCalculationService(
      {
        calculateTripFuelCost: jest.fn().mockResolvedValue({
          estimatedFuelCost: new Prisma.Decimal('66')
        })
      } as never,
      {
        calculateTripPackageCost: jest.fn().mockResolvedValue({
          totalAllocatedPackageCost: new Prisma.Decimal('100')
        })
      } as never
    );

    const result = await service.calculateTripIncome('user_1', vehicle, {
      cancellationIncome: '10.00',
      deadheadKm: '4.00',
      endedAt: new Date('2026-06-17T10:47:00+03:00'),
      grossIncome: '450.00',
      startedAt: new Date('2026-06-17T10:15:00+03:00'),
      tipAmount: '20.00',
      tripKm: '18.00'
    });

    expect(result.totalIncome.toFixed(2)).toBe('480.00');
    expect(result.totalKm.toFixed(2)).toBe('22.00');
    expect(result.durationMinutes).toBe(32);
    expect(result.estimatedFuelCost.toFixed(2)).toBe('66.00');
    expect(result.allocatedPackageCost.toFixed(2)).toBe('100.00');
    expect(result.cashNetProfit.toFixed(2)).toBe('414.00');
    expect(result.trueNetProfit.toFixed(2)).toBe('314.00');
  });

  it('returns zero fuel cost when vehicle has no fuel entry', async () => {
    const service = new IncomeCalculationService(
      {
        calculateTripFuelCost: jest.fn().mockResolvedValue({
          estimatedFuelCost: new Prisma.Decimal(0)
        })
      } as never,
      {} as never
    );

    const result = await service.calculateEstimatedFuelCost(
      'user_1',
      vehicle,
      new Prisma.Decimal('22')
    );

    expect(result.toFixed(2)).toBe('0.00');
  });

  it('builds a trip-level net profit placeholder breakdown', () => {
    const service = new IncomeCalculationService({} as never, {} as never);
    const breakdown = service.buildTripProfitBreakdown({
      allocated_depreciation_cost: new Prisma.Decimal('0'),
      allocated_fixed_cost: new Prisma.Decimal('0'),
      allocated_maintenance_cost: new Prisma.Decimal('0'),
      allocated_other_variable_cost: new Prisma.Decimal('0'),
      allocated_package_cost: new Prisma.Decimal('0'),
      cancellation_income: new Prisma.Decimal('0'),
      cash_net_profit: new Prisma.Decimal('414'),
      estimated_fuel_cost: new Prisma.Decimal('66'),
      gross_income: new Prisma.Decimal('450'),
      tip_amount: new Prisma.Decimal('30'),
      total_income: new Prisma.Decimal('480'),
      total_km: new Prisma.Decimal('22'),
      true_net_profit: new Prisma.Decimal('414')
    });

    expect(breakdown.cashNetProfit).toBe('414.00');
    expect(breakdown.trueNetProfit).toBe('414.00');
    expect(breakdown.packageCost).toBe('0.00');
    expect(breakdown.method.package).toBe(
      'active_tag_packages_allocated_by_package_method'
    );
    expect(breakdown.placeholderCosts).not.toContain('packageCost');
  });

  it('uses fallback duration when timestamps are missing', () => {
    const service = new IncomeCalculationService({} as never, {} as never);

    expect(service.resolveDurationMinutes(null, null, 45)).toBe(45);
  });

  it('rejects negative trip duration', () => {
    const service = new IncomeCalculationService({} as never, {} as never);

    expect(() =>
      service.resolveDurationMinutes(
        new Date('2026-06-17T10:47:00+03:00'),
        new Date('2026-06-17T10:15:00+03:00'),
        null
      )
    ).toThrow(BadRequestException);
  });
});

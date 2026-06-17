import { BadRequestException } from '@nestjs/common';
import { Prisma, Vehicle } from '@prisma/client';
import { IncomeCalculationService } from './income-calculation.service';

const vehicle = {
  average_consumption_l_per_100km: new Prisma.Decimal('7.5'),
  id: 'vehicle_1'
} as Vehicle;

describe('IncomeCalculationService', () => {
  it('calculates trip income, km, duration and fuel cost', async () => {
    const service = new IncomeCalculationService({
      fuelEntry: {
        findFirst: jest.fn().mockResolvedValue({
          price_per_liter: new Prisma.Decimal('40')
        })
      }
    } as never);

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
    expect(result.cashNetProfit.toFixed(2)).toBe('414.00');
    expect(result.trueNetProfit.toFixed(2)).toBe('414.00');
  });

  it('returns zero fuel cost when vehicle has no fuel entry', async () => {
    const service = new IncomeCalculationService({
      fuelEntry: {
        findFirst: jest.fn().mockResolvedValue(null)
      }
    } as never);

    const result = await service.calculateEstimatedFuelCost(
      'user_1',
      vehicle,
      new Prisma.Decimal('22')
    );

    expect(result.toFixed(2)).toBe('0.00');
  });

  it('uses fallback duration when timestamps are missing', () => {
    const service = new IncomeCalculationService({} as never);

    expect(service.resolveDurationMinutes(null, null, 45)).toBe(45);
  });

  it('rejects negative trip duration', () => {
    const service = new IncomeCalculationService({} as never);

    expect(() =>
      service.resolveDurationMinutes(
        new Date('2026-06-17T10:47:00+03:00'),
        new Date('2026-06-17T10:15:00+03:00'),
        null
      )
    ).toThrow(BadRequestException);
  });
});

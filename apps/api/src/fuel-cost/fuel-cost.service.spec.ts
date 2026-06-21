import { Prisma, Vehicle } from '@prisma/client';
import { FinanceCalculationEngine } from '../finance-calculation/finance-calculation.engine';
import { FuelCostService } from './fuel-cost.service';

const vehicle = {
  average_consumption_l_per_100km: new Prisma.Decimal('7.5'),
  id: 'vehicle_1'
} as Vehicle;

describe('FuelCostService', () => {
  it('calculates trip fuel cost from latest fuel price and vehicle consumption', async () => {
    const service = new FuelCostService(new FinanceCalculationEngine(), {
      fuelEntry: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'fuel_1',
          price_per_liter: new Prisma.Decimal('40')
        })
      }
    } as never);

    const result = await service.calculateTripFuelCost(
      'user_1',
      vehicle,
      new Prisma.Decimal('22')
    );

    expect(result.estimatedLiters.toFixed(3)).toBe('1.650');
    expect(result.fuelCostPerKm.toFixed(4)).toBe('3.0000');
    expect(result.estimatedFuelCost.toFixed(2)).toBe('66.00');
    expect(result.latestFuelEntryId).toBe('fuel_1');
  });

  it('uses default fuel price when no fuel entry exists', async () => {
    process.env.DEFAULT_FUEL_PRICE_PER_LITER = '42';
    const service = new FuelCostService(new FinanceCalculationEngine(), {
      fuelEntry: {
        findFirst: jest.fn().mockResolvedValue(null)
      }
    } as never);

    const result = await service.calculateTripFuelCost(
      'user_1',
      vehicle,
      new Prisma.Decimal('22')
    );

    expect(result.latestFuelEntryId).toBeNull();
    expect(result.latestFuelPricePerLiter.toFixed(3)).toBe('42.000');
    expect(result.estimatedFuelCost.toFixed(2)).toBe('69.30');
    expect(result.priceSource).toBe('DEFAULT_FUEL_PRICE_PER_LITER');
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'FUEL_PRICE_MISSING' })
    );
    delete process.env.DEFAULT_FUEL_PRICE_PER_LITER;
  });

  it('builds a fuel cost breakdown', async () => {
    const service = new FuelCostService(new FinanceCalculationEngine(), {
      fuelEntry: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'fuel_1',
          price_per_liter: new Prisma.Decimal('40')
        })
      }
    } as never);

    const result = await service.calculateTripFuelCost(
      'user_1',
      vehicle,
      new Prisma.Decimal('22')
    );
    const breakdown = service.buildFuelCostBreakdown(result);

    expect(breakdown.totalKm).toBe('22.00');
    expect(breakdown.averageConsumptionLPer100Km).toBe('7.500');
    expect(breakdown.latestFuelPricePerLiter).toBe('40.000');
    expect(breakdown.estimatedFuelCost).toBe('66.00');
    expect(breakdown.calculationVersion).toBe('fuel-cost-v1');
  });
});

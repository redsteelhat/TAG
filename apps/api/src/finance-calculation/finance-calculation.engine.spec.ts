import { DepreciationModel, Prisma } from '@prisma/client';
import { FinanceCalculationEngine } from './finance-calculation.engine';

describe('FinanceCalculationEngine', () => {
  const engine = new FinanceCalculationEngine();

  it('calculates trip net profit with all cost shares', () => {
    const result = engine.calculateTripNetProfit({
      cancellationIncome: '10',
      costs: {
        depreciationCost: '20',
        fixedCostShare: '30',
        fuelCost: '60',
        maintenanceReserve: '15',
        packageShare: '40',
        variableCostShare: '5'
      },
      grossIncome: '450',
      tipAmount: '20'
    });

    expect(result.value.totalIncome.toFixed(2)).toBe('480.00');
    expect(result.value.totalCost.toFixed(2)).toBe('170.00');
    expect(result.value.netProfit.toFixed(2)).toBe('310.00');
    expect(result.formulaDescription).toContain('Net kâr');
  });

  it('returns zero km net profit for 0 km edge case', () => {
    const result = engine.calculateKmNetProfit({
      netProfit: '500',
      totalKm: '0'
    });

    expect(result.value.toFixed(2)).toBe('0.00');
  });

  it('returns zero hourly net profit for 0 duration edge case', () => {
    const result = engine.calculateHourlyNetProfit({
      activeMinutes: 0,
      netProfit: '500'
    });

    expect(result.value.toFixed(2)).toBe('0.00');
  });

  it('warns when package is not defined', () => {
    const result = engine.calculatePeriodNetProfit({
      costs: {
        fuelCost: '100',
        fixedCostShare: '50',
        maintenanceReserve: '25',
        depreciationCost: '10'
      },
      grossIncome: '500'
    });

    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'PACKAGE_NOT_DEFINED' })
    );
  });

  it('returns depreciation warning when depreciation is disabled', () => {
    const result = engine.calculateDepreciation({
      date: new Date('2026-06-18T00:00:00.000Z'),
      depreciationEnabled: false,
      model: DepreciationModel.PER_KM,
      totalKm: '100',
      yearlyEstimatedKm: '30000',
      yearlyValueLoss: '60000'
    });

    expect(result.value.toFixed(2)).toBe('0.00');
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'DEPRECIATION_DISABLED' })
    );
  });

  it('warns when fuel price is missing but vehicle consumption exists', () => {
    const result = engine.calculateFuelCost({
      averageLiterPer100Km: '7.5',
      lastFuelPricePerLiter: null,
      totalKm: '22'
    });

    expect(result.value.tripFuelCost.toFixed(2)).toBe('0.00');
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'FUEL_PRICE_MISSING' })
    );
  });

  it('warns when vehicle average consumption is missing', () => {
    const result = engine.calculateFuelCost({
      averageLiterPer100Km: '0',
      lastFuelPricePerLiter: '45',
      totalKm: '22'
    });

    expect(result.value.tripFuelCost.toFixed(2)).toBe('0.00');
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'VEHICLE_CONSUMPTION_MISSING' })
    );
  });

  it('warns when maintenance interval is zero', () => {
    const result = engine.calculateMaintenanceReserve({
      maintenanceAmount: '8000',
      maintenanceIntervalKm: '0',
      totalKm: '22'
    });

    expect(result.value.toFixed(2)).toBe('0.00');
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'MAINTENANCE_NOT_DEFINED' })
    );
  });

  it('calculates daily, weekly, and monthly aggregate net profit safely', () => {
    const daily = engine.calculatePeriodNetProfit({
      costs: {
        depreciationCost: '10',
        fixedCostShare: '20',
        fuelCost: '100',
        maintenanceReserve: '30',
        packageShare: '40',
        variableCostShare: '50'
      },
      grossIncome: '600'
    });
    const weekly = engine.calculatePeriodNetProfit({
      costs: {
        depreciationCost: '70',
        fixedCostShare: '140',
        fuelCost: '700',
        maintenanceReserve: '210',
        packageShare: '280',
        variableCostShare: '350'
      },
      grossIncome: '4200'
    });
    const monthly = engine.calculatePeriodNetProfit({
      costs: {
        depreciationCost: new Prisma.Decimal('300'),
        fixedCostShare: new Prisma.Decimal('600'),
        fuelCost: new Prisma.Decimal('3000'),
        maintenanceReserve: new Prisma.Decimal('900'),
        packageShare: new Prisma.Decimal('1200'),
        variableCostShare: new Prisma.Decimal('1500')
      },
      grossIncome: new Prisma.Decimal('18000')
    });

    expect(daily.value.netProfit.toFixed(2)).toBe('350.00');
    expect(weekly.value.netProfit.toFixed(2)).toBe('2450.00');
    expect(monthly.value.netProfit.toFixed(2)).toBe('10500.00');
  });

  it('calculates break-even target and clamps progress', () => {
    const result = engine.calculateBreakEven({
      depreciationCost: '20',
      fixedCostShare: '80',
      fuelCost: '120',
      grossIncome: '620',
      maintenanceReserve: '40',
      packageShare: '150'
    });

    expect(result.value.breakEvenTarget.toFixed(2)).toBe('410.00');
    expect(result.value.progress.toFixed(2)).toBe('100.00');
    expect(result.value.remaining.toFixed(2)).toBe('0.00');
    expect(result.value.status).toBe('REACHED');
  });
});

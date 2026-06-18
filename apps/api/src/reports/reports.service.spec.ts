import {
  AllocationType,
  ExpenseType,
  PackageAllocationMethod,
  Prisma
} from '@prisma/client';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  it('calculates daily profit with trip, package, direct expense, and recurring costs', async () => {
    const prisma = {
      $transaction: jest.fn((queries: Array<Promise<unknown>>) =>
        Promise.all(queries)
      ),
      trip: {
        aggregate: jest.fn().mockResolvedValue({
          _count: {
            _all: 4
          },
          _sum: {
            allocated_depreciation_cost: new Prisma.Decimal('0'),
            allocated_fixed_cost: new Prisma.Decimal('0'),
            allocated_maintenance_cost: new Prisma.Decimal('0'),
            allocated_other_variable_cost: new Prisma.Decimal('10'),
            allocated_package_cost: new Prisma.Decimal('300'),
            cash_net_profit: new Prisma.Decimal('880'),
            cancellation_income: new Prisma.Decimal('0'),
            deadhead_km: new Prisma.Decimal('20'),
            duration_minutes: 300,
            estimated_fuel_cost: new Prisma.Decimal('120'),
            gross_income: new Prisma.Decimal('950'),
            tip_amount: new Prisma.Decimal('50'),
            total_income: new Prisma.Decimal('1000'),
            total_km: new Prisma.Decimal('100'),
            true_net_profit: new Prisma.Decimal('580'),
            trip_km: new Prisma.Decimal('80')
          }
        })
      },
      shift: {
        aggregate: jest.fn().mockResolvedValue({
          _count: {
            _all: 1
          },
          _sum: {
            active_minutes: 360
          }
        })
      },
      expenseEntry: {
        findMany: jest.fn().mockResolvedValue([
          {
            amount: new Prisma.Decimal('40'),
            expense_type: ExpenseType.VARIABLE
          },
          {
            amount: new Prisma.Decimal('70'),
            expense_type: ExpenseType.PLATFORM_PACKAGE
          },
          {
            amount: new Prisma.Decimal('20'),
            expense_type: ExpenseType.SEMI_VARIABLE
          },
          {
            amount: new Prisma.Decimal('15'),
            expense_type: ExpenseType.DEPRECIATION
          },
          {
            amount: new Prisma.Decimal('30'),
            expense_type: ExpenseType.FIXED
          }
        ])
      },
      fuelEntry: {
        aggregate: jest.fn().mockResolvedValue({
          _count: {
            _all: 1
          },
          _sum: {
            amount: new Prisma.Decimal('500'),
            liters: new Prisma.Decimal('20')
          }
        })
      },
      recurringExpense: {
        findMany: jest.fn().mockResolvedValue([
          {
            amount: new Prisma.Decimal('310'),
            expense_type: ExpenseType.FIXED,
            starts_at: new Date('2026-06-01T00:00:00.000Z'),
            ends_at: null,
            period: AllocationType.MONTHLY
          }
        ])
      },
      tagPackage: {
        findMany: jest.fn().mockResolvedValue([
          {
            allocation_method: PackageAllocationMethod.PER_DAY,
            amount: new Prisma.Decimal('700'),
            duration_days: 7,
            ends_at: new Date('2026-06-24T00:00:00.000Z'),
            starts_at: new Date('2026-06-18T00:00:00.000Z'),
            vehicle_id: 'vehicle_1'
          }
        ])
      }
    };
    const service = new ReportsService(prisma as never);

    const result = await service.calculateDailyProfit('user_1', {
      date: '2026-06-18',
      vehicleId: 'vehicle_1'
    });

    expect(result.grossIncome).toBe('1000.00');
    expect(result.fuelCost).toBe('120.00');
    expect(result.tagPackageCost).toBe('170.00');
    expect(result.variableExpenses).toBe('50.00');
    expect(result.fixedExpenses).toBe('40.33');
    expect(result.maintenanceReserve).toBe('20.00');
    expect(result.depreciation).toBe('15.00');
    expect(result.totalCost).toBe('415.33');
    expect(result.netProfit).toBe('584.67');
    expect(result.kmProfit).toBe('5.85');
    expect(result.hourlyProfit).toBe('97.45');
    expect(result.actualFuelPurchaseCost).toBe('500.00');
    expect(result.sourceBreakdown.tripAllocatedPackageCostReference).toBe(
      '300.00'
    );
    expect(result.sourceBreakdown.calculatedTagPackageCost).toBe('100.00');
  });

  it('calculates weekly profit using Monday week range by default', async () => {
    const prisma = {
      $transaction: jest.fn((queries: Array<Promise<unknown>>) =>
        Promise.all(queries)
      ),
      trip: {
        aggregate: jest.fn().mockResolvedValue({
          _count: {
            _all: 12
          },
          _sum: {
            allocated_depreciation_cost: new Prisma.Decimal('0'),
            allocated_fixed_cost: new Prisma.Decimal('0'),
            allocated_maintenance_cost: new Prisma.Decimal('0'),
            allocated_other_variable_cost: new Prisma.Decimal('0'),
            allocated_package_cost: new Prisma.Decimal('700'),
            cash_net_profit: new Prisma.Decimal('1900'),
            cancellation_income: new Prisma.Decimal('0'),
            deadhead_km: new Prisma.Decimal('40'),
            duration_minutes: 900,
            estimated_fuel_cost: new Prisma.Decimal('300'),
            gross_income: new Prisma.Decimal('2100'),
            tip_amount: new Prisma.Decimal('100'),
            total_income: new Prisma.Decimal('2200'),
            total_km: new Prisma.Decimal('300'),
            true_net_profit: new Prisma.Decimal('1200'),
            trip_km: new Prisma.Decimal('260')
          }
        }),
        count: jest.fn()
      },
      shift: {
        aggregate: jest.fn().mockResolvedValue({
          _count: {
            _all: 4
          },
          _sum: {
            active_minutes: 960
          }
        })
      },
      expenseEntry: {
        findMany: jest.fn().mockResolvedValue([
          {
            amount: new Prisma.Decimal('140'),
            expense_type: ExpenseType.VARIABLE
          }
        ])
      },
      fuelEntry: {
        aggregate: jest.fn().mockResolvedValue({
          _count: {
            _all: 2
          },
          _sum: {
            amount: new Prisma.Decimal('900'),
            liters: new Prisma.Decimal('36')
          }
        })
      },
      recurringExpense: {
        findMany: jest.fn().mockResolvedValue([
          {
            amount: new Prisma.Decimal('300'),
            expense_type: ExpenseType.FIXED,
            starts_at: new Date('2026-06-01T00:00:00.000Z'),
            ends_at: null,
            period: AllocationType.MONTHLY
          }
        ])
      },
      tagPackage: {
        findMany: jest.fn().mockResolvedValue([
          {
            allocation_method: PackageAllocationMethod.PER_DAY,
            amount: new Prisma.Decimal('700'),
            duration_days: 7,
            ends_at: new Date('2026-06-21T00:00:00.000Z'),
            starts_at: new Date('2026-06-15T00:00:00.000Z'),
            vehicle_id: 'vehicle_1'
          }
        ])
      }
    };
    const service = new ReportsService(prisma as never);

    const result = await service.calculateWeeklyProfit('user_1', {
      date: '2026-06-18',
      vehicleId: 'vehicle_1'
    });

    expect(result.period).toBe('weekly');
    expect(result.startDate).toBe('2026-06-15');
    expect(result.endDate).toBe('2026-06-21');
    expect(result.grossIncome).toBe('2200.00');
    expect(result.fuelCost).toBe('300.00');
    expect(result.tagPackageCost).toBe('700.00');
    expect(result.fixedExpenses).toBe('70.00');
    expect(result.variableExpenses).toBe('140.00');
    expect(result.totalCost).toBe('1210.00');
    expect(result.netProfit).toBe('990.00');
    expect(result.kmProfit).toBe('3.30');
    expect(result.hourlyProfit).toBe('61.88');
  });
});

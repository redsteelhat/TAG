import {
  AllocationType,
  ExpenseType,
  PackageAllocationMethod,
  Prisma
} from '@prisma/client';
import { ReportCacheService } from './report-cache.service';
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
    const service = new ReportsService(
      prisma as never,
      new ReportCacheService()
    );

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
    const service = new ReportsService(
      prisma as never,
      new ReportCacheService()
    );

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

  it('calculates monthly profit from a YYYY-MM month query', async () => {
    const prisma = {
      $transaction: jest.fn((queries: Array<Promise<unknown>>) =>
        Promise.all(queries)
      ),
      trip: {
        aggregate: jest.fn().mockResolvedValue({
          _count: {
            _all: 48
          },
          _sum: {
            allocated_depreciation_cost: new Prisma.Decimal('0'),
            allocated_fixed_cost: new Prisma.Decimal('0'),
            allocated_maintenance_cost: new Prisma.Decimal('0'),
            allocated_other_variable_cost: new Prisma.Decimal('0'),
            allocated_package_cost: new Prisma.Decimal('700'),
            cash_net_profit: new Prisma.Decimal('8500'),
            cancellation_income: new Prisma.Decimal('0'),
            deadhead_km: new Prisma.Decimal('140'),
            duration_minutes: 5400,
            estimated_fuel_cost: new Prisma.Decimal('1500'),
            gross_income: new Prisma.Decimal('9600'),
            tip_amount: new Prisma.Decimal('400'),
            total_income: new Prisma.Decimal('10000'),
            total_km: new Prisma.Decimal('1000'),
            true_net_profit: new Prisma.Decimal('7800'),
            trip_km: new Prisma.Decimal('860')
          }
        }),
        count: jest.fn()
      },
      shift: {
        aggregate: jest.fn().mockResolvedValue({
          _count: {
            _all: 20
          },
          _sum: {
            active_minutes: 6000
          }
        })
      },
      expenseEntry: {
        findMany: jest.fn().mockResolvedValue([
          {
            amount: new Prisma.Decimal('200'),
            expense_type: ExpenseType.VARIABLE
          }
        ])
      },
      fuelEntry: {
        aggregate: jest.fn().mockResolvedValue({
          _count: {
            _all: 6
          },
          _sum: {
            amount: new Prisma.Decimal('2800'),
            liters: new Prisma.Decimal('112')
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
    const service = new ReportsService(
      prisma as never,
      new ReportCacheService()
    );

    const result = await service.calculateMonthlyProfit('user_1', {
      month: '2026-06',
      vehicleId: 'vehicle_1'
    });

    expect(result.period).toBe('monthly');
    expect(result.date).toBe('2026-06');
    expect(result.startDate).toBe('2026-06-01');
    expect(result.endDate).toBe('2026-06-30');
    expect(result.grossIncome).toBe('10000.00');
    expect(result.fuelCost).toBe('1500.00');
    expect(result.tagPackageCost).toBe('700.00');
    expect(result.fixedExpenses).toBe('300.00');
    expect(result.variableExpenses).toBe('200.00');
    expect(result.totalCost).toBe('2700.00');
    expect(result.netProfit).toBe('7300.00');
    expect(result.kmProfit).toBe('7.30');
    expect(result.hourlyProfit).toBe('73.00');
  });

  it('calculates per-kilometer profitability breakdown', async () => {
    const prisma = {
      $transaction: jest.fn((queries: Array<Promise<unknown>>) =>
        Promise.all(queries)
      ),
      trip: {
        aggregate: jest.fn().mockResolvedValue({
          _count: {
            _all: 5
          },
          _sum: {
            allocated_depreciation_cost: new Prisma.Decimal('0'),
            allocated_fixed_cost: new Prisma.Decimal('0'),
            allocated_maintenance_cost: new Prisma.Decimal('0'),
            allocated_other_variable_cost: new Prisma.Decimal('0'),
            allocated_package_cost: new Prisma.Decimal('0'),
            cash_net_profit: new Prisma.Decimal('800'),
            cancellation_income: new Prisma.Decimal('0'),
            deadhead_km: new Prisma.Decimal('40'),
            duration_minutes: 240,
            estimated_fuel_cost: new Prisma.Decimal('200'),
            gross_income: new Prisma.Decimal('1000'),
            tip_amount: new Prisma.Decimal('0'),
            total_income: new Prisma.Decimal('1000'),
            total_km: new Prisma.Decimal('200'),
            true_net_profit: new Prisma.Decimal('800'),
            trip_km: new Prisma.Decimal('160')
          }
        })
      },
      shift: {
        aggregate: jest.fn().mockResolvedValue({
          _count: {
            _all: 1
          },
          _sum: {
            active_minutes: 240
          }
        })
      },
      expenseEntry: {
        findMany: jest.fn().mockResolvedValue([
          {
            amount: new Prisma.Decimal('100'),
            expense_type: ExpenseType.VARIABLE
          }
        ])
      },
      fuelEntry: {
        aggregate: jest.fn().mockResolvedValue({
          _count: {
            _all: 0
          },
          _sum: {
            amount: null,
            liters: null
          }
        })
      },
      recurringExpense: {
        findMany: jest.fn().mockResolvedValue([])
      },
      tagPackage: {
        findMany: jest.fn().mockResolvedValue([])
      }
    };
    const service = new ReportsService(
      prisma as never,
      new ReportCacheService()
    );

    const result = await service.calculateKmProfitability('user_1', {
      date: '2026-06-18',
      vehicleId: 'vehicle_1'
    });

    expect(result.period).toBe('daily');
    expect(result.totalKm).toBe('200.00');
    expect(result.grossIncomePerKm).toBe('5.00');
    expect(result.costPerKm).toBe('1.50');
    expect(result.netProfitPerKm).toBe('3.50');
    expect(result.fuelCostPerKm).toBe('1.00');
    expect(result.variableExpensePerKm).toBe('0.50');
  });

  it('calculates per-hour profitability breakdown', async () => {
    const prisma = {
      $transaction: jest.fn((queries: Array<Promise<unknown>>) =>
        Promise.all(queries)
      ),
      trip: {
        aggregate: jest.fn().mockResolvedValue({
          _count: {
            _all: 6
          },
          _sum: {
            allocated_depreciation_cost: new Prisma.Decimal('0'),
            allocated_fixed_cost: new Prisma.Decimal('0'),
            allocated_maintenance_cost: new Prisma.Decimal('0'),
            allocated_other_variable_cost: new Prisma.Decimal('0'),
            allocated_package_cost: new Prisma.Decimal('0'),
            cash_net_profit: new Prisma.Decimal('750'),
            cancellation_income: new Prisma.Decimal('0'),
            deadhead_km: new Prisma.Decimal('30'),
            duration_minutes: 300,
            estimated_fuel_cost: new Prisma.Decimal('250'),
            gross_income: new Prisma.Decimal('1000'),
            tip_amount: new Prisma.Decimal('0'),
            total_income: new Prisma.Decimal('1000'),
            total_km: new Prisma.Decimal('180'),
            true_net_profit: new Prisma.Decimal('750'),
            trip_km: new Prisma.Decimal('150')
          }
        })
      },
      shift: {
        aggregate: jest.fn().mockResolvedValue({
          _count: {
            _all: 1
          },
          _sum: {
            active_minutes: 300
          }
        })
      },
      expenseEntry: {
        findMany: jest.fn().mockResolvedValue([
          {
            amount: new Prisma.Decimal('150'),
            expense_type: ExpenseType.VARIABLE
          }
        ])
      },
      fuelEntry: {
        aggregate: jest.fn().mockResolvedValue({
          _count: {
            _all: 0
          },
          _sum: {
            amount: null,
            liters: null
          }
        })
      },
      recurringExpense: {
        findMany: jest.fn().mockResolvedValue([])
      },
      tagPackage: {
        findMany: jest.fn().mockResolvedValue([])
      }
    };
    const service = new ReportsService(
      prisma as never,
      new ReportCacheService()
    );

    const result = await service.calculateHourlyProfitability('user_1', {
      date: '2026-06-18',
      vehicleId: 'vehicle_1'
    });

    expect(result.period).toBe('daily');
    expect(result.activeMinutes).toBe(300);
    expect(result.activeHours).toBe('5.00');
    expect(result.grossIncomePerHour).toBe('200.00');
    expect(result.costPerHour).toBe('80.00');
    expect(result.netProfitPerHour).toBe('120.00');
    expect(result.fuelCostPerHour).toBe('50.00');
    expect(result.variableExpensePerHour).toBe('30.00');
  });

  it('calculates break-even target and remaining revenue', async () => {
    const prisma = {
      $transaction: jest.fn((queries: Array<Promise<unknown>>) =>
        Promise.all(queries)
      ),
      trip: {
        aggregate: jest.fn().mockResolvedValue({
          _count: {
            _all: 3
          },
          _sum: {
            allocated_depreciation_cost: new Prisma.Decimal('0'),
            allocated_fixed_cost: new Prisma.Decimal('0'),
            allocated_maintenance_cost: new Prisma.Decimal('0'),
            allocated_other_variable_cost: new Prisma.Decimal('0'),
            allocated_package_cost: new Prisma.Decimal('0'),
            cash_net_profit: new Prisma.Decimal('450'),
            cancellation_income: new Prisma.Decimal('0'),
            deadhead_km: new Prisma.Decimal('20'),
            duration_minutes: 180,
            estimated_fuel_cost: new Prisma.Decimal('150'),
            gross_income: new Prisma.Decimal('600'),
            tip_amount: new Prisma.Decimal('0'),
            total_income: new Prisma.Decimal('600'),
            total_km: new Prisma.Decimal('120'),
            true_net_profit: new Prisma.Decimal('450'),
            trip_km: new Prisma.Decimal('100')
          }
        })
      },
      shift: {
        aggregate: jest.fn().mockResolvedValue({
          _count: {
            _all: 1
          },
          _sum: {
            active_minutes: 180
          }
        })
      },
      expenseEntry: {
        findMany: jest.fn().mockResolvedValue([
          {
            amount: new Prisma.Decimal('250'),
            expense_type: ExpenseType.PLATFORM_PACKAGE
          },
          {
            amount: new Prisma.Decimal('100'),
            expense_type: ExpenseType.FIXED
          }
        ])
      },
      fuelEntry: {
        aggregate: jest.fn().mockResolvedValue({
          _count: {
            _all: 0
          },
          _sum: {
            amount: null,
            liters: null
          }
        })
      },
      recurringExpense: {
        findMany: jest.fn().mockResolvedValue([])
      },
      tagPackage: {
        findMany: jest.fn().mockResolvedValue([])
      }
    };
    const service = new ReportsService(
      prisma as never,
      new ReportCacheService()
    );

    const result = await service.calculateBreakEven('user_1', {
      date: '2026-06-18',
      vehicleId: 'vehicle_1'
    });

    expect(result.period).toBe('daily');
    expect(result.grossIncome).toBe('600.00');
    expect(result.breakEvenRevenue).toBe('500.00');
    expect(result.remainingRevenue).toBe('0.00');
    expect(result.surplusRevenue).toBe('100.00');
    expect(result.breakEvenProgressPercent).toBe('120.00');
    expect(result.isBreakEvenReached).toBe(true);
    expect(result.costBreakdown.fuelCost).toBe('150.00');
    expect(result.costBreakdown.tagPackageCost).toBe('250.00');
    expect(result.costBreakdown.fixedExpenses).toBe('100.00');
  });

  it('builds report overview from report APIs', async () => {
    const service = new ReportsService({} as never, new ReportCacheService());
    const dailyProfit = { period: 'daily', netProfit: '100.00' };
    const weeklyProfit = { period: 'weekly', netProfit: '700.00' };
    const monthlyProfit = { period: 'monthly', netProfit: '3000.00' };
    const kmProfitability = { netProfitPerKm: '5.00' };
    const hourlyProfitability = { netProfitPerHour: '120.00' };
    const breakEven = { breakEvenRevenue: '500.00' };

    jest
      .spyOn(service, 'calculateDailyProfit')
      .mockResolvedValue(dailyProfit as never);
    jest
      .spyOn(service, 'calculateWeeklyProfit')
      .mockResolvedValue(weeklyProfit as never);
    jest
      .spyOn(service, 'calculateMonthlyProfit')
      .mockResolvedValue(monthlyProfit as never);
    jest
      .spyOn(service, 'calculateKmProfitability')
      .mockResolvedValue(kmProfitability as never);
    jest
      .spyOn(service, 'calculateHourlyProfitability')
      .mockResolvedValue(hourlyProfitability as never);
    jest
      .spyOn(service, 'calculateBreakEven')
      .mockResolvedValue(breakEven as never);

    const result = await service.getReportOverview('user_1', {
      date: '2026-06-18',
      month: '2026-06',
      vehicleId: 'vehicle_1',
      weekStart: '2026-06-15'
    });

    expect(result.dailyProfit).toBe(dailyProfit);
    expect(result.weeklyProfit).toBe(weeklyProfit);
    expect(result.monthlyProfit).toBe(monthlyProfit);
    expect(result.kmProfitability).toBe(kmProfitability);
    expect(result.hourlyProfitability).toBe(hourlyProfitability);
    expect(result.breakEven).toBe(breakEven);
    expect(result.availableReports).toContain('breakEven');
    expect(result.vehicleId).toBe('vehicle_1');
    expect(service.calculateWeeklyProfit).toHaveBeenCalledWith('user_1', {
      date: '2026-06-18',
      vehicleId: 'vehicle_1',
      weekStart: '2026-06-15'
    });
    expect(service.calculateMonthlyProfit).toHaveBeenCalledWith('user_1', {
      date: '2026-06-18',
      month: '2026-06',
      vehicleId: 'vehicle_1'
    });
  });
});

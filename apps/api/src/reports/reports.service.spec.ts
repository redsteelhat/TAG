import {
  AllocationType,
  ExpenseType,
  FixedCostAllocationMethod,
  PackageAllocationMethod,
  Prisma
} from '@prisma/client';
import { FinanceCalculationEngine } from '../finance-calculation/finance-calculation.engine';
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
      new FinanceCalculationEngine(),
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
    expectProfitReportFormula(result);
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
      new FinanceCalculationEngine(),
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
    expectProfitReportFormula(result);
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
      new FinanceCalculationEngine(),
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
    expectProfitReportFormula(result);
  });

  it('allocates recurring fixed costs only on active days when requested', async () => {
    const prisma = {
      $transaction: jest.fn((queries: Array<Promise<unknown>>) =>
        Promise.all(queries)
      ),
      trip: {
        aggregate: jest.fn().mockResolvedValue({
          _count: {
            _all: 2
          },
          _sum: {
            allocated_depreciation_cost: new Prisma.Decimal('0'),
            allocated_fixed_cost: new Prisma.Decimal('0'),
            allocated_maintenance_cost: new Prisma.Decimal('0'),
            allocated_other_variable_cost: new Prisma.Decimal('0'),
            allocated_package_cost: new Prisma.Decimal('0'),
            cash_net_profit: new Prisma.Decimal('1000'),
            cancellation_income: new Prisma.Decimal('0'),
            deadhead_km: new Prisma.Decimal('0'),
            duration_minutes: 120,
            estimated_fuel_cost: new Prisma.Decimal('0'),
            gross_income: new Prisma.Decimal('1000'),
            tip_amount: new Prisma.Decimal('0'),
            total_income: new Prisma.Decimal('1000'),
            total_km: new Prisma.Decimal('100'),
            true_net_profit: new Prisma.Decimal('1000'),
            trip_km: new Prisma.Decimal('100')
          }
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            trip_date: new Date('2026-06-18T09:00:00.000Z')
          }
        ])
      },
      shift: {
        aggregate: jest.fn().mockResolvedValue({
          _count: {
            _all: 1
          },
          _sum: {
            active_minutes: 120
          }
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            started_at: new Date('2026-06-20T09:00:00.000Z')
          }
        ])
      },
      expenseEntry: {
        findMany: jest.fn().mockResolvedValue([])
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
        findMany: jest.fn().mockResolvedValue([
          {
            allocation_method: FixedCostAllocationMethod.ACTIVE_DAY,
            amount: new Prisma.Decimal('300'),
            expense_type: ExpenseType.FIXED,
            starts_at: new Date('2026-06-01T00:00:00.000Z'),
            ends_at: null,
            period: AllocationType.MONTHLY,
            vehicle_id: 'vehicle_1'
          }
        ])
      },
      tagPackage: {
        findMany: jest.fn().mockResolvedValue([])
      }
    };
    const service = new ReportsService(
      new FinanceCalculationEngine(),
      prisma as never,
      new ReportCacheService()
    );

    const result = await service.calculateWeeklyProfit('user_1', {
      date: '2026-06-18',
      vehicleId: 'vehicle_1'
    });

    expect(result.fixedExpenses).toBe('20.00');
    expect(result.totalCost).toBe('20.00');
    expect(result.netProfit).toBe('980.00');
    expectProfitReportFormula(result);
  });

  it('allocates recurring fixed costs by kilometer when requested', async () => {
    const prisma = {
      $transaction: jest.fn((queries: Array<Promise<unknown>>) =>
        Promise.all(queries)
      ),
      trip: {
        aggregate: jest
          .fn()
          .mockResolvedValueOnce({
            _count: {
              _all: 5
            },
            _sum: {
              allocated_depreciation_cost: new Prisma.Decimal('0'),
              allocated_fixed_cost: new Prisma.Decimal('0'),
              allocated_maintenance_cost: new Prisma.Decimal('0'),
              allocated_other_variable_cost: new Prisma.Decimal('0'),
              allocated_package_cost: new Prisma.Decimal('0'),
              cash_net_profit: new Prisma.Decimal('1000'),
              cancellation_income: new Prisma.Decimal('0'),
              deadhead_km: new Prisma.Decimal('0'),
              duration_minutes: 300,
              estimated_fuel_cost: new Prisma.Decimal('0'),
              gross_income: new Prisma.Decimal('1000'),
              tip_amount: new Prisma.Decimal('0'),
              total_income: new Prisma.Decimal('1000'),
              total_km: new Prisma.Decimal('150'),
              true_net_profit: new Prisma.Decimal('1000'),
              trip_km: new Prisma.Decimal('150')
            }
          })
          .mockResolvedValueOnce({
            _sum: {
              total_km: new Prisma.Decimal('150')
            }
          })
          .mockResolvedValueOnce({
            _sum: {
              total_km: new Prisma.Decimal('600')
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
        findMany: jest.fn().mockResolvedValue([])
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
        findMany: jest.fn().mockResolvedValue([
          {
            allocation_method: FixedCostAllocationMethod.PER_KM,
            amount: new Prisma.Decimal('300'),
            expense_type: ExpenseType.FIXED,
            starts_at: new Date('2026-06-01T00:00:00.000Z'),
            ends_at: null,
            period: AllocationType.MONTHLY,
            vehicle_id: 'vehicle_1'
          }
        ])
      },
      tagPackage: {
        findMany: jest.fn().mockResolvedValue([])
      }
    };
    const service = new ReportsService(
      new FinanceCalculationEngine(),
      prisma as never,
      new ReportCacheService()
    );

    const result = await service.calculateWeeklyProfit('user_1', {
      date: '2026-06-18',
      vehicleId: 'vehicle_1'
    });

    expect(result.fixedExpenses).toBe('75.00');
    expect(result.totalCost).toBe('75.00');
    expect(result.netProfit).toBe('925.00');
    expectProfitReportFormula(result);
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
      new FinanceCalculationEngine(),
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
    expectKmProfitabilityFormula(result);
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
      new FinanceCalculationEngine(),
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
    expectHourlyProfitabilityFormula(result);
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
      new FinanceCalculationEngine(),
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
    expect(result.breakEvenProgressPercent).toBe('100.00');
    expect(result.isBreakEvenReached).toBe(true);
    expect(result.status).toBe('REACHED');
    expect(result.costBreakdown.fuelCost).toBe('150.00');
    expect(result.costBreakdown.tagPackageCost).toBe('250.00');
    expect(result.costBreakdown.fixedExpenses).toBe('100.00');
    expectBreakEvenFormula(result);
  });

  it('builds report overview from report APIs', async () => {
    const service = new ReportsService(new FinanceCalculationEngine(), {} as never, new ReportCacheService());
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
    jest
      .spyOn(service as never, 'buildDashboardAggregation')
      .mockResolvedValue({ hasData: true } as never);

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
    expect(result.dashboard).toEqual({ hasData: true });
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

  it('builds dashboard aggregation from the same daily period data', async () => {
    const prisma = {
      $transaction: jest.fn((queries: Array<Promise<unknown>>) =>
        Promise.all(queries)
      ),
      trip: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'trip_1',
            trip_date: new Date('2026-06-18T09:00:00.000Z'),
            started_at: new Date('2026-06-18T09:10:00.000Z'),
            pickup_location: 'Kadıköy',
            dropoff_location: 'Ataşehir',
            total_km: new Prisma.Decimal('18'),
            total_income: new Prisma.Decimal('620'),
            true_net_profit: new Prisma.Decimal('312')
          }
        ])
      },
      shift: {
        findMany: jest.fn().mockResolvedValue([
          {
            active_minutes: 180,
            ended_at: null,
            id: 'shift_1',
            started_at: new Date('2026-06-18T08:00:00.000Z'),
            status: 'ACTIVE',
            total_km: new Prisma.Decimal('54')
          }
        ])
      },
      vehicle: {
        findMany: jest.fn().mockResolvedValue([])
      }
    };
    const service = new ReportsService(
      new FinanceCalculationEngine(),
      prisma as never,
      new ReportCacheService()
    );

    const result = await (
      service as unknown as {
        buildDashboardAggregation: (
          userId: string,
          periodRange: unknown,
          dailyProfit: unknown,
          kmProfitability: unknown,
          hourlyProfitability: unknown,
          breakEven: unknown,
          vehicleId?: string
        ) => Promise<{
          breakEvenProgress: string;
          breakEvenRemaining: string;
          breakEvenStatus: string;
          expenseImpact: Array<{ key: string; percentage: number }>;
          recentTrips: Array<{ id: string; netProfit: string }>;
          shiftSummary: { activeMinutes: number; status: string };
          todayGrossIncome: string;
        }>;
      }
    ).buildDashboardAggregation(
      'user_1',
      {
        date: '2026-06-18',
        endDate: '2026-06-18',
        nextStart: new Date('2026-06-19T00:00:00.000Z'),
        period: 'daily',
        start: new Date('2026-06-18T00:00:00.000Z'),
        startDate: '2026-06-18'
      },
      {
        activeMinutes: 180,
        activePackageCount: 1,
        actualFuelEntryCount: 1,
        actualFuelPurchaseCost: '820.00',
        depreciation: '20.00',
        directExpenseCount: 1,
        fixedExpenses: '80.00',
        fuelCost: '120.00',
        grossIncome: '620.00',
        maintenanceReserve: '40.00',
        netProfit: '210.00',
        recurringExpenseCount: 1,
        tagPackageCost: '150.00',
        totalCost: '410.00',
        totalKm: '18.00',
        tripCount: 1,
        variableExpenses: '0.00'
      },
      {
        netProfitPerKm: '11.67'
      },
      {
        netProfitPerHour: '70.00'
      },
      {
        breakEvenRevenue: '410.00',
        remainingRevenue: '0.00'
      },
      'vehicle_1'
    );

    expect(result.todayGrossIncome).toBe('620.00');
    expect(result.breakEvenProgress).toBe('100.00');
    expect(result.breakEvenRemaining).toBe('0.00');
    expect(result.breakEvenStatus).toBe('REACHED');
    expect(result.recentTrips).toEqual([
      expect.objectContaining({
        id: 'trip_1',
        netProfit: '312.00'
      })
    ]);
    expect(result.expenseImpact).toContainEqual(
      expect.objectContaining({
        key: 'fuelCost',
        percentage: 29
      })
    );
    expect(result.shiftSummary).toEqual(
      expect.objectContaining({
        activeMinutes: 180,
        status: 'ACTIVE'
      })
    );
    expect(prisma.trip.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          trip_date: {
            gte: new Date('2026-06-18T00:00:00.000Z'),
            lt: new Date('2026-06-19T00:00:00.000Z')
          },
          vehicle_id: 'vehicle_1'
        })
      })
    );
  });
});

function expectProfitReportFormula(report: {
  activeMinutes: number;
  depreciation: string;
  fixedExpenses: string;
  fuelCost: string;
  grossIncome: string;
  hourlyProfit: string;
  kmProfit: string;
  maintenanceReserve: string;
  netProfit: string;
  tagPackageCost: string;
  totalCost: string;
  totalKm: string;
  variableExpenses: string;
}) {
  const totalCost = sumMoney(
    report.fuelCost,
    report.tagPackageCost,
    report.variableExpenses,
    report.fixedExpenses,
    report.maintenanceReserve,
    report.depreciation
  );
  const netProfit = decimal(report.grossIncome).minus(totalCost);
  const totalKm = decimal(report.totalKm);
  const activeHours =
    report.activeMinutes > 0
      ? decimal(report.activeMinutes).div(60)
      : decimal(0);

  expectMoney(report.totalCost, totalCost);
  expectMoney(report.netProfit, netProfit);
  expectMoney(report.kmProfit, divideOrZero(netProfit, totalKm));
  expectMoney(report.hourlyProfit, divideOrZero(netProfit, activeHours));
}

function expectKmProfitabilityFormula(report: {
  costPerKm: string;
  depreciationPerKm: string;
  fixedExpensePerKm: string;
  fuelCostPerKm: string;
  grossIncome: string;
  grossIncomePerKm: string;
  maintenanceReservePerKm: string;
  netProfit: string;
  netProfitPerKm: string;
  packageCostPerKm: string;
  totalCost: string;
  totalKm: string;
  variableExpensePerKm: string;
}) {
  const totalKm = decimal(report.totalKm);
  const componentCostPerKm = sumMoney(
    report.fuelCostPerKm,
    report.packageCostPerKm,
    report.variableExpensePerKm,
    report.fixedExpensePerKm,
    report.maintenanceReservePerKm,
    report.depreciationPerKm
  );

  expectMoney(
    report.grossIncomePerKm,
    divideOrZero(decimal(report.grossIncome), totalKm)
  );
  expectMoney(report.costPerKm, divideOrZero(decimal(report.totalCost), totalKm));
  expectMoney(
    report.netProfitPerKm,
    divideOrZero(decimal(report.netProfit), totalKm)
  );
  expectMoney(report.costPerKm, componentCostPerKm);
}

function expectHourlyProfitabilityFormula(report: {
  activeHours: string;
  costPerHour: string;
  depreciationPerHour: string;
  fixedExpensePerHour: string;
  fuelCostPerHour: string;
  grossIncome: string;
  grossIncomePerHour: string;
  maintenanceReservePerHour: string;
  netProfit: string;
  netProfitPerHour: string;
  packageCostPerHour: string;
  totalCost: string;
  variableExpensePerHour: string;
}) {
  const activeHours = decimal(report.activeHours);
  const componentCostPerHour = sumMoney(
    report.fuelCostPerHour,
    report.packageCostPerHour,
    report.variableExpensePerHour,
    report.fixedExpensePerHour,
    report.maintenanceReservePerHour,
    report.depreciationPerHour
  );

  expectMoney(
    report.grossIncomePerHour,
    divideOrZero(decimal(report.grossIncome), activeHours)
  );
  expectMoney(
    report.costPerHour,
    divideOrZero(decimal(report.totalCost), activeHours)
  );
  expectMoney(
    report.netProfitPerHour,
    divideOrZero(decimal(report.netProfit), activeHours)
  );
  expectMoney(report.costPerHour, componentCostPerHour);
}

function expectBreakEvenFormula(report: {
  breakEvenProgressPercent: string;
  breakEvenRevenue: string;
  costBreakdown: {
    depreciation: string;
    fixedExpenses: string;
    fuelCost: string;
    maintenanceReserve: string;
    tagPackageCost: string;
    variableExpenses: string;
  };
  grossIncome: string;
  isBreakEvenReached: boolean;
  remainingRevenue: string;
  surplusRevenue: string;
}) {
  const breakEvenRevenue = sumMoney(
    report.costBreakdown.fuelCost,
    report.costBreakdown.tagPackageCost,
    report.costBreakdown.variableExpenses,
    report.costBreakdown.fixedExpenses,
    report.costBreakdown.maintenanceReserve,
    report.costBreakdown.depreciation
  );
  const grossIncome = decimal(report.grossIncome);
  const remainingRevenue = positiveDifference(breakEvenRevenue, grossIncome);
  const surplusRevenue = positiveDifference(grossIncome, breakEvenRevenue);
  const progress = breakEvenRevenue.gt(0)
    ? Prisma.Decimal.min(grossIncome.mul(100).div(breakEvenRevenue), 100)
    : decimal(0);

  expectMoney(report.breakEvenRevenue, breakEvenRevenue);
  expectMoney(report.remainingRevenue, remainingRevenue);
  expectMoney(report.surplusRevenue, surplusRevenue);
  expectMoney(report.breakEvenProgressPercent, progress);
  expect(report.isBreakEvenReached).toBe(
    breakEvenRevenue.gt(0) && grossIncome.gte(breakEvenRevenue)
  );
}

function sumMoney(...values: Array<string | number | Prisma.Decimal>) {
  let total = new Prisma.Decimal(0);

  for (const value of values) {
    total = total.plus(decimal(value));
  }

  return total;
}

function expectMoney(actual: string, expected: Prisma.Decimal) {
  expect(decimal(actual).toFixed(2)).toBe(
    expected.toDecimalPlaces(2).toFixed(2)
  );
}

function divideOrZero(numerator: Prisma.Decimal, denominator: Prisma.Decimal) {
  return denominator.lte(0) ? decimal(0) : numerator.div(denominator);
}

function positiveDifference(
  minuend: Prisma.Decimal,
  subtrahend: Prisma.Decimal
) {
  const difference = minuend.minus(subtrahend);

  return difference.gt(0) ? difference : decimal(0);
}

function decimal(value: string | number | Prisma.Decimal) {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

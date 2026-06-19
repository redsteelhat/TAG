import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AllocationType,
  ExpenseEntry,
  ExpenseType,
  PackageAllocationMethod,
  Prisma,
  RecurringExpense,
  TagPackage
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BreakEvenPeriod,
  BreakEvenQueryDto
} from './dto/break-even-query.dto';
import { DailyProfitQueryDto } from './dto/daily-profit-query.dto';
import {
  HourlyProfitPeriod,
  HourlyProfitQueryDto
} from './dto/hourly-profit-query.dto';
import { KmProfitPeriod, KmProfitQueryDto } from './dto/km-profit-query.dto';
import { MonthlyProfitQueryDto } from './dto/monthly-profit-query.dto';
import { ReportOverviewQueryDto } from './dto/report-overview-query.dto';
import { WeeklyProfitQueryDto } from './dto/weekly-profit-query.dto';

type ProfitPeriod = 'daily' | 'weekly' | 'monthly';

interface PeriodRange {
  date: string;
  endDate: string;
  nextStart: Date;
  period: ProfitPeriod;
  start: Date;
  startDate: string;
}

interface CostBuckets {
  depreciation: Prisma.Decimal;
  fixed: Prisma.Decimal;
  maintenance: Prisma.Decimal;
  package: Prisma.Decimal;
  variable: Prisma.Decimal;
}

@Injectable()
export class ReportsService {
  readonly calculationVersion = 'profit-period-v1';

  constructor(private readonly prisma: PrismaService) {}

  async calculateDailyProfit(userId: string, query: DailyProfitQueryDto) {
    return this.calculateProfitForPeriod(
      userId,
      this.resolveDayRange(query.date),
      query.vehicleId
    );
  }

  async calculateWeeklyProfit(userId: string, query: WeeklyProfitQueryDto) {
    return this.calculateProfitForPeriod(
      userId,
      query.weekStart
        ? this.resolveWeekRange(query.weekStart, false)
        : this.resolveWeekRange(query.date),
      query.vehicleId
    );
  }

  async calculateMonthlyProfit(userId: string, query: MonthlyProfitQueryDto) {
    return this.calculateProfitForPeriod(
      userId,
      this.resolveMonthRange(query.month ?? query.date),
      query.vehicleId
    );
  }

  async calculateKmProfitability(userId: string, query: KmProfitQueryDto) {
    const periodRange = this.resolveKmProfitPeriodRange(query);
    const profit = await this.calculateProfitForPeriod(
      userId,
      periodRange,
      query.vehicleId
    );
    const totalKm = this.decimal(profit.totalKm);
    const grossIncome = this.decimal(profit.grossIncome);
    const totalCost = this.decimal(profit.totalCost);
    const netProfit = this.decimal(profit.netProfit);

    return {
      date: profit.date,
      endDate: profit.endDate,
      period: profit.period,
      startDate: profit.startDate,
      vehicleId: profit.vehicleId,
      totalKm: profit.totalKm,
      grossIncome: profit.grossIncome,
      totalCost: profit.totalCost,
      netProfit: profit.netProfit,
      grossIncomePerKm: this.money(this.divideOrZero(grossIncome, totalKm)),
      costPerKm: this.money(this.divideOrZero(totalCost, totalKm)),
      netProfitPerKm: this.money(this.divideOrZero(netProfit, totalKm)),
      fuelCostPerKm: this.money(
        this.divideOrZero(this.decimal(profit.fuelCost), totalKm)
      ),
      packageCostPerKm: this.money(
        this.divideOrZero(this.decimal(profit.tagPackageCost), totalKm)
      ),
      variableExpensePerKm: this.money(
        this.divideOrZero(this.decimal(profit.variableExpenses), totalKm)
      ),
      fixedExpensePerKm: this.money(
        this.divideOrZero(this.decimal(profit.fixedExpenses), totalKm)
      ),
      maintenanceReservePerKm: this.money(
        this.divideOrZero(this.decimal(profit.maintenanceReserve), totalKm)
      ),
      depreciationPerKm: this.money(
        this.divideOrZero(this.decimal(profit.depreciation), totalKm)
      ),
      tripCount: profit.tripCount,
      formula: {
        grossIncomePerKm: 'grossIncome / totalKm',
        costPerKm: 'totalCost / totalKm',
        netProfitPerKm: 'netProfit / totalKm'
      },
      calculationVersion: profit.calculationVersion
    };
  }

  async calculateHourlyProfitability(
    userId: string,
    query: HourlyProfitQueryDto
  ) {
    const periodRange = this.resolveHourlyProfitPeriodRange(query);
    const profit = await this.calculateProfitForPeriod(
      userId,
      periodRange,
      query.vehicleId
    );
    const activeHours =
      profit.activeMinutes > 0
        ? new Prisma.Decimal(profit.activeMinutes).div(60)
        : new Prisma.Decimal(0);
    const grossIncome = this.decimal(profit.grossIncome);
    const totalCost = this.decimal(profit.totalCost);
    const netProfit = this.decimal(profit.netProfit);

    return {
      date: profit.date,
      endDate: profit.endDate,
      period: profit.period,
      startDate: profit.startDate,
      vehicleId: profit.vehicleId,
      activeMinutes: profit.activeMinutes,
      activeHours: activeHours.toDecimalPlaces(2).toFixed(2),
      grossIncome: profit.grossIncome,
      totalCost: profit.totalCost,
      netProfit: profit.netProfit,
      grossIncomePerHour: this.money(
        this.divideOrZero(grossIncome, activeHours)
      ),
      costPerHour: this.money(this.divideOrZero(totalCost, activeHours)),
      netProfitPerHour: this.money(this.divideOrZero(netProfit, activeHours)),
      fuelCostPerHour: this.money(
        this.divideOrZero(this.decimal(profit.fuelCost), activeHours)
      ),
      packageCostPerHour: this.money(
        this.divideOrZero(this.decimal(profit.tagPackageCost), activeHours)
      ),
      variableExpensePerHour: this.money(
        this.divideOrZero(this.decimal(profit.variableExpenses), activeHours)
      ),
      fixedExpensePerHour: this.money(
        this.divideOrZero(this.decimal(profit.fixedExpenses), activeHours)
      ),
      maintenanceReservePerHour: this.money(
        this.divideOrZero(this.decimal(profit.maintenanceReserve), activeHours)
      ),
      depreciationPerHour: this.money(
        this.divideOrZero(this.decimal(profit.depreciation), activeHours)
      ),
      tripCount: profit.tripCount,
      shiftCount: profit.shiftCount,
      formula: {
        grossIncomePerHour: 'grossIncome / activeHours',
        costPerHour: 'totalCost / activeHours',
        netProfitPerHour: 'netProfit / activeHours'
      },
      calculationVersion: profit.calculationVersion
    };
  }

  async calculateBreakEven(userId: string, query: BreakEvenQueryDto) {
    const periodRange = this.resolveBreakEvenPeriodRange(query);
    const profit = await this.calculateProfitForPeriod(
      userId,
      periodRange,
      query.vehicleId
    );
    const grossIncome = this.decimal(profit.grossIncome);
    const breakEvenRevenue = this.decimal(profit.totalCost);
    const remainingRevenue = this.positiveDifference(
      breakEvenRevenue,
      grossIncome
    );
    const surplusRevenue = this.positiveDifference(
      grossIncome,
      breakEvenRevenue
    );
    const breakEvenProgressPercent = breakEvenRevenue.gt(0)
      ? grossIncome.mul(100).div(breakEvenRevenue)
      : new Prisma.Decimal(100);

    return {
      date: profit.date,
      endDate: profit.endDate,
      period: profit.period,
      startDate: profit.startDate,
      vehicleId: profit.vehicleId,
      grossIncome: profit.grossIncome,
      breakEvenRevenue: this.money(breakEvenRevenue),
      remainingRevenue: this.money(remainingRevenue),
      surplusRevenue: this.money(surplusRevenue),
      breakEvenProgressPercent: breakEvenProgressPercent
        .toDecimalPlaces(2)
        .toFixed(2),
      isBreakEvenReached: grossIncome.gte(breakEvenRevenue),
      netProfit: profit.netProfit,
      costBreakdown: {
        fuelCost: profit.fuelCost,
        tagPackageCost: profit.tagPackageCost,
        variableExpenses: profit.variableExpenses,
        fixedExpenses: profit.fixedExpenses,
        maintenanceReserve: profit.maintenanceReserve,
        depreciation: profit.depreciation
      },
      formula: {
        breakEvenRevenue:
          'fuelCost + tagPackageCost + variableExpenses + fixedExpenses + maintenanceReserve + depreciation',
        remainingRevenue: 'max(breakEvenRevenue - grossIncome, 0)',
        surplusRevenue: 'max(grossIncome - breakEvenRevenue, 0)'
      },
      calculationVersion: profit.calculationVersion
    };
  }

  async getReportOverview(userId: string, query: ReportOverviewQueryDto) {
    const [dailyProfit, weeklyProfit, monthlyProfit, kmProfitability, hourlyProfitability, breakEven] =
      await Promise.all([
        this.calculateDailyProfit(userId, {
          date: query.date,
          vehicleId: query.vehicleId
        }),
        this.calculateWeeklyProfit(userId, {
          date: query.date,
          vehicleId: query.vehicleId,
          weekStart: query.weekStart
        }),
        this.calculateMonthlyProfit(userId, {
          date: query.date,
          month: query.month,
          vehicleId: query.vehicleId
        }),
        this.calculateKmProfitability(userId, {
          date: query.date,
          period: KmProfitPeriod.DAILY,
          vehicleId: query.vehicleId
        }),
        this.calculateHourlyProfitability(userId, {
          date: query.date,
          period: HourlyProfitPeriod.DAILY,
          vehicleId: query.vehicleId
        }),
        this.calculateBreakEven(userId, {
          date: query.date,
          period: BreakEvenPeriod.DAILY,
          vehicleId: query.vehicleId
        })
      ]);

    return {
      generatedAt: new Date().toISOString(),
      vehicleId: query.vehicleId ?? null,
      dailyProfit,
      weeklyProfit,
      monthlyProfit,
      kmProfitability,
      hourlyProfitability,
      breakEven,
      availableReports: [
        'dailyProfit',
        'weeklyProfit',
        'monthlyProfit',
        'kmProfitability',
        'hourlyProfitability',
        'breakEven'
      ],
      calculationVersion: this.calculationVersion
    };
  }

  private async calculateProfitForPeriod(
    userId: string,
    periodRange: PeriodRange,
    vehicleId?: string
  ) {
    const vehicleFilter = vehicleId
      ? {
          vehicle_id: vehicleId
        }
      : {};
    const dateFilter = {
      gte: periodRange.start,
      lt: periodRange.nextStart
    };
    const tripWhere: Prisma.TripWhereInput = {
      user_id: userId,
      deleted_at: null,
      trip_date: dateFilter,
      ...vehicleFilter
    };

    const [
      tripAggregate,
      shiftAggregate,
      directExpenses,
      fuelAggregate,
      recurringExpenses,
      activePackages
    ] = await this.prisma.$transaction([
      this.prisma.trip.aggregate({
        where: tripWhere,
        _count: {
          _all: true
        },
        _sum: {
          allocated_depreciation_cost: true,
          allocated_fixed_cost: true,
          allocated_maintenance_cost: true,
          allocated_other_variable_cost: true,
          allocated_package_cost: true,
          cash_net_profit: true,
          deadhead_km: true,
          duration_minutes: true,
          estimated_fuel_cost: true,
          gross_income: true,
          tip_amount: true,
          cancellation_income: true,
          total_income: true,
          total_km: true,
          true_net_profit: true,
          trip_km: true
        }
      }),
      this.prisma.shift.aggregate({
        where: {
          user_id: userId,
          status: {
            not: 'CANCELED'
          },
          started_at: dateFilter,
          ...vehicleFilter
        },
        _count: {
          _all: true
        },
        _sum: {
          active_minutes: true
        }
      }),
      this.prisma.expenseEntry.findMany({
        where: {
          user_id: userId,
          deleted_at: null,
          expense_date: dateFilter,
          ...vehicleFilter
        }
      }),
      this.prisma.fuelEntry.aggregate({
        where: {
          user_id: userId,
          deleted_at: null,
          created_at: dateFilter,
          ...vehicleFilter
        },
        _count: {
          _all: true
        },
        _sum: {
          amount: true,
          liters: true
        }
      }),
      this.prisma.recurringExpense.findMany({
        where: {
          user_id: userId,
          deleted_at: null,
          is_active: true,
          starts_at: {
            lt: periodRange.nextStart
          },
          OR: [
            {
              ends_at: null
            },
            {
              ends_at: {
                gte: periodRange.start
              }
            }
          ],
          ...vehicleFilter
        }
      }),
      this.prisma.tagPackage.findMany({
        where: {
          user_id: userId,
          deleted_at: null,
          is_active: true,
          starts_at: {
            lt: periodRange.nextStart
          },
          ends_at: {
            gte: periodRange.start
          },
          ...vehicleFilter
        }
      })
    ]);

    const directCosts = this.calculateDirectExpenseBuckets(directExpenses);
    const recurringCosts = this.calculateRecurringExpenseBuckets(
      recurringExpenses,
      periodRange
    );
    const tagPackageCost = await this.calculateTagPackageCostForPeriod(
      userId,
      activePackages,
      periodRange
    );
    const grossIncome = this.decimal(tripAggregate._sum.total_income);
    const tripGrossIncome = this.decimal(tripAggregate._sum.gross_income);
    const tipAmount = this.decimal(tripAggregate._sum.tip_amount);
    const cancellationIncome = this.decimal(
      tripAggregate._sum.cancellation_income
    );
    const estimatedFuelCost = this.decimal(
      tripAggregate._sum.estimated_fuel_cost
    );
    const packageCost = tagPackageCost
      .plus(directCosts.package)
      .plus(recurringCosts.package);
    const variableExpenses = this.decimal(
      tripAggregate._sum.allocated_other_variable_cost
    )
      .plus(directCosts.variable)
      .plus(recurringCosts.variable);
    const fixedExpenses = this.decimal(tripAggregate._sum.allocated_fixed_cost)
      .plus(directCosts.fixed)
      .plus(recurringCosts.fixed);
    const maintenanceReserve = this.decimal(
      tripAggregate._sum.allocated_maintenance_cost
    )
      .plus(directCosts.maintenance)
      .plus(recurringCosts.maintenance);
    const depreciation = this.decimal(
      tripAggregate._sum.allocated_depreciation_cost
    )
      .plus(directCosts.depreciation)
      .plus(recurringCosts.depreciation);
    const totalCost = estimatedFuelCost
      .plus(packageCost)
      .plus(variableExpenses)
      .plus(fixedExpenses)
      .plus(maintenanceReserve)
      .plus(depreciation);
    const netProfit = grossIncome.minus(totalCost);
    const totalKm = this.decimal(tripAggregate._sum.total_km);
    const activeMinutes =
      shiftAggregate._sum.active_minutes ??
      tripAggregate._sum.duration_minutes ??
      0;

    return {
      date: periodRange.date,
      endDate: periodRange.endDate,
      period: periodRange.period,
      startDate: periodRange.startDate,
      vehicleId: vehicleId ?? null,
      grossIncome: this.money(grossIncome),
      tripGrossIncome: this.money(tripGrossIncome),
      tipAmount: this.money(tipAmount),
      cancellationIncome: this.money(cancellationIncome),
      fuelCost: this.money(estimatedFuelCost),
      tagPackageCost: this.money(packageCost),
      variableExpenses: this.money(variableExpenses),
      fixedExpenses: this.money(fixedExpenses),
      maintenanceReserve: this.money(maintenanceReserve),
      depreciation: this.money(depreciation),
      totalCost: this.money(totalCost),
      netProfit: this.money(netProfit),
      kmProfit: this.money(this.divideOrZero(netProfit, totalKm)),
      hourlyProfit: this.money(
        activeMinutes > 0
          ? netProfit.div(new Prisma.Decimal(activeMinutes).div(60))
          : new Prisma.Decimal(0)
      ),
      totalKm: totalKm.toFixed(2),
      activeMinutes,
      tripCount: tripAggregate._count._all,
      shiftCount: shiftAggregate._count._all,
      directExpenseCount: directExpenses.length,
      recurringExpenseCount: recurringExpenses.length,
      activePackageCount: activePackages.length,
      actualFuelPurchaseCost: this.money(this.decimal(fuelAggregate._sum.amount)),
      actualFuelLiters: this.decimal(fuelAggregate._sum.liters).toFixed(3),
      actualFuelEntryCount: fuelAggregate._count._all,
      sourceBreakdown: {
        tripEstimatedFuelCost: this.money(estimatedFuelCost),
        tripAllocatedPackageCostReference: this.money(
          this.decimal(tripAggregate._sum.allocated_package_cost)
        ),
        calculatedTagPackageCost: this.money(tagPackageCost),
        directPackageExpenseCost: this.money(directCosts.package),
        recurringAllocatedCost: this.money(this.sumCostBuckets(recurringCosts)),
        directVariableExpenseCost: this.money(directCosts.variable),
        directFixedExpenseCost: this.money(directCosts.fixed),
        directMaintenanceExpenseCost: this.money(directCosts.maintenance),
        directDepreciationExpenseCost: this.money(directCosts.depreciation)
      },
      formula: {
        netProfit:
          'grossIncome - fuelCost - tagPackageCost - variableExpenses - fixedExpenses - maintenanceReserve - depreciation',
        fuelCost:
          'estimated consumption from recorded trip km; actual fuel purchases are reported separately',
        tagPackageCost:
          'period active package allocation + direct package expenses + recurring package expenses'
      },
      calculationVersion: this.calculationVersion
    };
  }

  private calculateDirectExpenseBuckets(
    expenses: ExpenseEntry[]
  ): CostBuckets {
    return expenses.reduce(
      (buckets, expense) =>
        this.addExpenseToBuckets(buckets, expense.expense_type, expense.amount),
      this.emptyCostBuckets()
    );
  }

  private calculateRecurringExpenseBuckets(
    recurringExpenses: RecurringExpense[],
    periodRange: PeriodRange
  ): CostBuckets {
    return recurringExpenses.reduce((buckets, expense) => {
      const periodCost = this.calculateRecurringPeriodCost(
        expense,
        periodRange
      );

      return this.addExpenseToBuckets(
        buckets,
        expense.expense_type,
        periodCost
      );
    }, this.emptyCostBuckets());
  }

  private addExpenseToBuckets(
    buckets: CostBuckets,
    expenseType: ExpenseType,
    amount: Prisma.Decimal
  ) {
    if (expenseType === ExpenseType.PLATFORM_PACKAGE) {
      buckets.package = buckets.package.plus(amount);
      return buckets;
    }

    if (expenseType === ExpenseType.SEMI_VARIABLE) {
      buckets.maintenance = buckets.maintenance.plus(amount);
      return buckets;
    }

    if (expenseType === ExpenseType.DEPRECIATION) {
      buckets.depreciation = buckets.depreciation.plus(amount);
      return buckets;
    }

    if (
      expenseType === ExpenseType.FIXED ||
      expenseType === ExpenseType.FINANCING
    ) {
      buckets.fixed = buckets.fixed.plus(amount);
      return buckets;
    }

    buckets.variable = buckets.variable.plus(amount);
    return buckets;
  }

  private async calculateTagPackageCostForPeriod(
    userId: string,
    activePackages: TagPackage[],
    periodRange: PeriodRange
  ) {
    const costs = await Promise.all(
      activePackages.map((tagPackage) =>
        this.calculateTagPackageLineForPeriod(userId, tagPackage, periodRange)
      )
    );

    return costs.reduce(
      (total, cost) => total.plus(cost),
      new Prisma.Decimal(0)
    );
  }

  private async calculateTagPackageLineForPeriod(
    userId: string,
    tagPackage: TagPackage,
    periodRange: PeriodRange
  ) {
    if (tagPackage.allocation_method === PackageAllocationMethod.PER_TRIP) {
      const [periodTripCount, packageTripCount] = await Promise.all([
        this.prisma.trip.count({
          where: {
            user_id: userId,
            vehicle_id: tagPackage.vehicle_id,
            deleted_at: null,
            trip_date: {
              gte: periodRange.start,
              lt: periodRange.nextStart
            }
          }
        }),
        this.prisma.trip.count({
          where: {
            user_id: userId,
            vehicle_id: tagPackage.vehicle_id,
            deleted_at: null,
            trip_date: {
              gte: tagPackage.starts_at,
              lte: tagPackage.ends_at
            }
          }
        })
      ]);

      if (packageTripCount === 0) {
        return new Prisma.Decimal(0);
      }

      return tagPackage.amount
        .mul(periodTripCount)
        .div(packageTripCount)
        .toDecimalPlaces(2);
    }

    if (tagPackage.allocation_method === PackageAllocationMethod.PER_KM) {
      const [periodKm, packageKm] = await Promise.all([
        this.sumTripKm(userId, tagPackage.vehicle_id, {
          gte: periodRange.start,
          lt: periodRange.nextStart
        }),
        this.sumTripKm(userId, tagPackage.vehicle_id, {
          gte: tagPackage.starts_at,
          lte: tagPackage.ends_at
        })
      ]);

      if (packageKm.lte(0)) {
        return new Prisma.Decimal(0);
      }

      return tagPackage.amount.mul(periodKm).div(packageKm).toDecimalPlaces(2);
    }

    const coveredDays = this.countCoveredDays(
      periodRange,
      tagPackage.starts_at,
      tagPackage.ends_at
    );

    return tagPackage.amount
      .div(Math.max(tagPackage.duration_days, 1))
      .mul(coveredDays)
      .toDecimalPlaces(2);
  }

  private async sumTripKm(
    userId: string,
    vehicleId: string,
    dateRange: Prisma.DateTimeFilter
  ) {
    const aggregate = await this.prisma.trip.aggregate({
      where: {
        user_id: userId,
        vehicle_id: vehicleId,
        deleted_at: null,
        trip_date: dateRange
      },
      _sum: {
        total_km: true
      }
    });

    return this.decimal(aggregate._sum.total_km);
  }

  private calculateRecurringPeriodCost(
    expense: RecurringExpense,
    periodRange: PeriodRange
  ) {
    const coveredDays = this.eachCoveredDay(
      periodRange,
      expense.starts_at,
      expense.ends_at
    );

    if (coveredDays.length === 0) {
      return new Prisma.Decimal(0);
    }

    if (expense.period === AllocationType.DAILY) {
      return expense.amount.mul(coveredDays.length).toDecimalPlaces(2);
    }

    let total = new Prisma.Decimal(0);

    for (const day of coveredDays) {
      if (expense.period === AllocationType.YEARLY) {
        total = total.plus(expense.amount.div(this.daysInYear(day)));
      } else if (expense.period === AllocationType.MONTHLY) {
        total = total.plus(expense.amount.div(this.daysInMonth(day)));
      } else {
        total = total.plus(expense.amount);
      }
    }

    return total.toDecimalPlaces(2);
  }

  private resolveDayRange(dateValue?: string): PeriodRange {
    const start = this.startOfUtcDay(this.parseDate(dateValue));
    const nextStart = new Date(start);

    nextStart.setUTCDate(nextStart.getUTCDate() + 1);

    return {
      date: start.toISOString().slice(0, 10),
      endDate: start.toISOString().slice(0, 10),
      nextStart,
      period: 'daily',
      start,
      startDate: start.toISOString().slice(0, 10)
    };
  }

  private resolveWeekRange(dateValue?: string, snapToMonday = true): PeriodRange {
    const date = this.startOfUtcDay(this.parseDate(dateValue));
    const start = new Date(date);

    if (snapToMonday) {
      start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
    }

    const nextStart = new Date(start);

    nextStart.setUTCDate(nextStart.getUTCDate() + 7);

    const end = new Date(nextStart);

    end.setUTCDate(end.getUTCDate() - 1);

    return {
      date: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      nextStart,
      period: 'weekly',
      start,
      startDate: start.toISOString().slice(0, 10)
    };
  }

  private resolveMonthRange(dateValue?: string): PeriodRange {
    const date = dateValue?.match(/^\d{4}-\d{2}$/)
      ? this.parseDate(`${dateValue}-01`)
      : this.parseDate(dateValue);
    const start = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
    );
    const nextStart = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)
    );
    const end = new Date(nextStart);

    end.setUTCDate(end.getUTCDate() - 1);

    return {
      date: start.toISOString().slice(0, 7),
      endDate: end.toISOString().slice(0, 10),
      nextStart,
      period: 'monthly',
      start,
      startDate: start.toISOString().slice(0, 10)
    };
  }

  private resolveKmProfitPeriodRange(query: KmProfitQueryDto): PeriodRange {
    const period =
      query.period ??
      (query.month
        ? KmProfitPeriod.MONTHLY
        : query.weekStart
          ? KmProfitPeriod.WEEKLY
          : KmProfitPeriod.DAILY);

    if (period === KmProfitPeriod.MONTHLY) {
      return this.resolveMonthRange(query.month ?? query.date);
    }

    if (period === KmProfitPeriod.WEEKLY) {
      return query.weekStart
        ? this.resolveWeekRange(query.weekStart, false)
        : this.resolveWeekRange(query.date);
    }

    return this.resolveDayRange(query.date);
  }

  private resolveHourlyProfitPeriodRange(
    query: HourlyProfitQueryDto
  ): PeriodRange {
    const period =
      query.period ??
      (query.month
        ? HourlyProfitPeriod.MONTHLY
        : query.weekStart
          ? HourlyProfitPeriod.WEEKLY
          : HourlyProfitPeriod.DAILY);

    if (period === HourlyProfitPeriod.MONTHLY) {
      return this.resolveMonthRange(query.month ?? query.date);
    }

    if (period === HourlyProfitPeriod.WEEKLY) {
      return query.weekStart
        ? this.resolveWeekRange(query.weekStart, false)
        : this.resolveWeekRange(query.date);
    }

    return this.resolveDayRange(query.date);
  }

  private resolveBreakEvenPeriodRange(query: BreakEvenQueryDto): PeriodRange {
    const period =
      query.period ??
      (query.month
        ? BreakEvenPeriod.MONTHLY
        : query.weekStart
          ? BreakEvenPeriod.WEEKLY
          : BreakEvenPeriod.DAILY);

    if (period === BreakEvenPeriod.MONTHLY) {
      return this.resolveMonthRange(query.month ?? query.date);
    }

    if (period === BreakEvenPeriod.WEEKLY) {
      return query.weekStart
        ? this.resolveWeekRange(query.weekStart, false)
        : this.resolveWeekRange(query.date);
    }

    return this.resolveDayRange(query.date);
  }

  private parseDate(dateValue?: string) {
    const date = dateValue ? new Date(dateValue) : new Date();

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date value.');
    }

    return date;
  }

  private countCoveredDays(
    periodRange: PeriodRange,
    startsAt: Date,
    endsAt?: Date | null
  ) {
    return this.eachCoveredDay(periodRange, startsAt, endsAt).length;
  }

  private eachCoveredDay(
    periodRange: PeriodRange,
    startsAt: Date,
    endsAt?: Date | null
  ) {
    const start = this.maxDate(periodRange.start, this.startOfUtcDay(startsAt));
    const endNext = this.minDate(
      periodRange.nextStart,
      endsAt ? this.nextUtcDayStart(endsAt) : periodRange.nextStart
    );
    const days: Date[] = [];
    const cursor = new Date(start);

    while (cursor < endNext) {
      days.push(new Date(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return days;
  }

  private startOfUtcDay(date: Date) {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    );
  }

  private nextUtcDayStart(date: Date) {
    const nextStart = this.startOfUtcDay(date);

    nextStart.setUTCDate(nextStart.getUTCDate() + 1);

    return nextStart;
  }

  private maxDate(first: Date, second: Date) {
    return first > second ? first : second;
  }

  private minDate(first: Date, second: Date) {
    return first < second ? first : second;
  }

  private emptyCostBuckets(): CostBuckets {
    return {
      depreciation: new Prisma.Decimal(0),
      fixed: new Prisma.Decimal(0),
      maintenance: new Prisma.Decimal(0),
      package: new Prisma.Decimal(0),
      variable: new Prisma.Decimal(0)
    };
  }

  private sumCostBuckets(buckets: CostBuckets) {
    return buckets.depreciation
      .plus(buckets.fixed)
      .plus(buckets.maintenance)
      .plus(buckets.package)
      .plus(buckets.variable);
  }

  private divideOrZero(numerator: Prisma.Decimal, denominator: Prisma.Decimal) {
    if (denominator.lte(0)) {
      return new Prisma.Decimal(0);
    }

    return numerator.div(denominator);
  }

  private positiveDifference(
    minuend: Prisma.Decimal,
    subtrahend: Prisma.Decimal
  ) {
    const difference = minuend.minus(subtrahend);

    return difference.gt(0) ? difference : new Prisma.Decimal(0);
  }

  private daysInMonth(date: Date) {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
    ).getUTCDate();
  }

  private daysInYear(date: Date) {
    const year = date.getUTCFullYear();
    const start = Date.UTC(year, 0, 1);
    const end = Date.UTC(year + 1, 0, 1);

    return Math.round((end - start) / (24 * 60 * 60 * 1000));
  }

  private decimal(
    value?: Prisma.Decimal | string | number | null
  ): Prisma.Decimal {
    if (value === null || value === undefined) {
      return new Prisma.Decimal(0);
    }

    return value instanceof Prisma.Decimal
      ? value
      : new Prisma.Decimal(value);
  }

  private money(value: Prisma.Decimal) {
    return value.toDecimalPlaces(2).toFixed(2);
  }
}

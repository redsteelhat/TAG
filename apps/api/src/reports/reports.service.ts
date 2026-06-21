import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AllocationType,
  ExpenseEntry,
  ExpenseType,
  FixedCostAllocationMethod,
  PackageAllocationMethod,
  Prisma,
  RecurringExpense,
  TagPackage
} from '@prisma/client';
import { FinanceCalculationEngine } from '../finance-calculation/finance-calculation.engine';
import { PrismaService } from '../prisma/prisma.service';
import { BreakEvenPeriod, BreakEvenQueryDto } from './dto/break-even-query.dto';
import { DailyProfitQueryDto } from './dto/daily-profit-query.dto';
import {
  HourlyProfitPeriod,
  HourlyProfitQueryDto
} from './dto/hourly-profit-query.dto';
import { KmProfitPeriod, KmProfitQueryDto } from './dto/km-profit-query.dto';
import { MonthlyProfitQueryDto } from './dto/monthly-profit-query.dto';
import { ReportOverviewQueryDto } from './dto/report-overview-query.dto';
import { WeeklyProfitQueryDto } from './dto/weekly-profit-query.dto';
import { ReportCacheService } from './report-cache.service';

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
  private readonly realtimeReportCacheTtlMs = 30_000;
  private readonly periodReportCacheTtlMs = 120_000;

  constructor(
    private readonly financeCalculationEngine: FinanceCalculationEngine,
    private readonly prisma: PrismaService,
    private readonly reportCache: ReportCacheService
  ) {}

  async calculateDailyProfit(userId: string, query: DailyProfitQueryDto) {
    return this.reportCache.getOrSet(
      this.buildReportCacheKey(userId, 'daily-profit', query),
      this.realtimeReportCacheTtlMs,
      () =>
        this.calculateProfitForPeriod(
          userId,
          this.resolveDayRange(query.date),
          query.vehicleId
        )
    );
  }

  async calculateWeeklyProfit(userId: string, query: WeeklyProfitQueryDto) {
    return this.reportCache.getOrSet(
      this.buildReportCacheKey(userId, 'weekly-profit', query),
      this.periodReportCacheTtlMs,
      () =>
        this.calculateProfitForPeriod(
          userId,
          query.weekStart
            ? this.resolveWeekRange(query.weekStart, false)
            : this.resolveWeekRange(query.date),
          query.vehicleId
        )
    );
  }

  async calculateMonthlyProfit(userId: string, query: MonthlyProfitQueryDto) {
    return this.reportCache.getOrSet(
      this.buildReportCacheKey(userId, 'monthly-profit', query),
      this.periodReportCacheTtlMs,
      () =>
        this.calculateProfitForPeriod(
          userId,
          this.resolveMonthRange(query.month ?? query.date),
          query.vehicleId
        )
    );
  }

  async calculateKmProfitability(userId: string, query: KmProfitQueryDto) {
    return this.reportCache.getOrSet(
      this.buildReportCacheKey(userId, 'km-profitability', query),
      this.realtimeReportCacheTtlMs,
      async () => {
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
        const netProfitPerKm =
          this.financeCalculationEngine.calculateKmNetProfit({
            netProfit,
            totalKm
          });

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
          netProfitPerKm: this.money(netProfitPerKm.value),
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
            netProfitPerKm: netProfitPerKm.formulaDescription
          },
          calculationWarnings: netProfitPerKm.warnings,
          calculationVersion: profit.calculationVersion
        };
      }
    );
  }

  async calculateHourlyProfitability(
    userId: string,
    query: HourlyProfitQueryDto
  ) {
    return this.reportCache.getOrSet(
      this.buildReportCacheKey(userId, 'hourly-profitability', query),
      this.realtimeReportCacheTtlMs,
      async () => {
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
        const netProfitPerHour =
          this.financeCalculationEngine.calculateHourlyNetProfit({
            activeMinutes: profit.activeMinutes,
            netProfit
          });

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
          netProfitPerHour: this.money(netProfitPerHour.value),
          fuelCostPerHour: this.money(
            this.divideOrZero(this.decimal(profit.fuelCost), activeHours)
          ),
          packageCostPerHour: this.money(
            this.divideOrZero(this.decimal(profit.tagPackageCost), activeHours)
          ),
          variableExpensePerHour: this.money(
            this.divideOrZero(
              this.decimal(profit.variableExpenses),
              activeHours
            )
          ),
          fixedExpensePerHour: this.money(
            this.divideOrZero(this.decimal(profit.fixedExpenses), activeHours)
          ),
          maintenanceReservePerHour: this.money(
            this.divideOrZero(
              this.decimal(profit.maintenanceReserve),
              activeHours
            )
          ),
          depreciationPerHour: this.money(
            this.divideOrZero(this.decimal(profit.depreciation), activeHours)
          ),
          tripCount: profit.tripCount,
          shiftCount: profit.shiftCount,
          formula: {
            grossIncomePerHour: 'grossIncome / activeHours',
            costPerHour: 'totalCost / activeHours',
            netProfitPerHour: netProfitPerHour.formulaDescription
          },
          calculationWarnings: netProfitPerHour.warnings,
          calculationVersion: profit.calculationVersion
        };
      }
    );
  }

  async calculateBreakEven(userId: string, query: BreakEvenQueryDto) {
    return this.reportCache.getOrSet(
      this.buildReportCacheKey(userId, 'break-even', query),
      this.realtimeReportCacheTtlMs,
      async () => {
        const periodRange = this.resolveBreakEvenPeriodRange(query);
        const profit = await this.calculateProfitForPeriod(
          userId,
          periodRange,
          query.vehicleId
        );
        const grossIncome = this.decimal(profit.grossIncome);
        const breakEvenResult = this.financeCalculationEngine.calculateBreakEven({
          depreciationCost: profit.depreciation,
          fixedCostShare: profit.fixedExpenses,
          fuelCost: profit.fuelCost,
          grossIncome,
          maintenanceReserve: profit.maintenanceReserve,
          packageShare: profit.tagPackageCost
        });
        const breakEvenRevenue = breakEvenResult.value.breakEvenTarget;
        const remainingRevenue = breakEvenResult.value.remaining;
        const surplusRevenue = this.positiveDifference(
          grossIncome,
          breakEvenRevenue
        );

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
          breakEvenProgressPercent: breakEvenResult.value.progress
            .toDecimalPlaces(2)
            .toFixed(2),
          isBreakEvenReached: breakEvenResult.value.status === 'REACHED',
          status: breakEvenResult.value.status,
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
            breakEvenRevenue: breakEvenResult.formulaDescription,
            remainingRevenue: 'max(breakEvenRevenue - grossIncome, 0)',
            surplusRevenue: 'max(grossIncome - breakEvenRevenue, 0)'
          },
          calculationWarnings: breakEvenResult.warnings,
          calculationVersion: profit.calculationVersion
        };
      }
    );
  }

  async getReportOverview(userId: string, query: ReportOverviewQueryDto) {
    return this.reportCache.getOrSet(
      this.buildReportCacheKey(userId, 'overview', query),
      this.realtimeReportCacheTtlMs,
      async () => {
        const [
          dailyProfit,
          weeklyProfit,
          monthlyProfit,
          kmProfitability,
          hourlyProfitability,
          breakEven
        ] = await Promise.all([
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

        const dashboard = await this.buildDashboardAggregation(
          userId,
          this.resolveDayRange(query.date),
          dailyProfit,
          kmProfitability,
          hourlyProfitability,
          breakEven,
          query.vehicleId
        );

        return {
          generatedAt: new Date().toISOString(),
          vehicleId: query.vehicleId ?? null,
          dailyProfit,
          weeklyProfit,
          monthlyProfit,
          kmProfitability,
          hourlyProfitability,
          breakEven,
          dashboard,
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
    );
  }

  private async buildDashboardAggregation(
    userId: string,
    periodRange: PeriodRange,
    dailyProfit: Awaited<ReturnType<ReportsService['calculateDailyProfit']>>,
    kmProfitability: Awaited<
      ReturnType<ReportsService['calculateKmProfitability']>
    >,
    hourlyProfitability: Awaited<
      ReturnType<ReportsService['calculateHourlyProfitability']>
    >,
    breakEven: Awaited<ReturnType<ReportsService['calculateBreakEven']>>,
    vehicleId?: string
  ) {
    const vehicleFilter = vehicleId ? { vehicle_id: vehicleId } : {};
    const dateFilter = {
      gte: periodRange.start,
      lt: periodRange.nextStart
    };
    const vehicleWhereFilter = vehicleId ? { id: vehicleId } : {};
    const [recentTrips, shifts, vehiclesWithTripsWithoutFuelAssumption] =
      await this.prisma.$transaction([
        this.prisma.trip.findMany({
          where: {
            user_id: userId,
            deleted_at: null,
            trip_date: dateFilter,
            ...vehicleFilter
          },
          orderBy: [
            {
              trip_date: 'desc'
            },
            {
              created_at: 'desc'
            }
          ],
          take: 5
        }),
        this.prisma.shift.findMany({
          where: {
            user_id: userId,
            status: {
              not: 'CANCELED'
            },
            started_at: dateFilter,
            ...vehicleFilter
          },
          orderBy: {
            started_at: 'desc'
          }
        }),
        this.prisma.vehicle.findMany({
          where: {
            user_id: userId,
            deleted_at: null,
            average_consumption_l_per_100km: {
              lte: 0
            },
            trips: {
              some: {
                user_id: userId,
                deleted_at: null,
                trip_date: dateFilter,
                total_km: {
                  gt: 0
                }
              }
            },
            ...vehicleWhereFilter
          },
          select: {
            id: true,
            plate_number: true
          }
        })
      ]);

    const grossIncome = this.decimal(dailyProfit.grossIncome);
    const breakEvenTarget = this.decimal(breakEven.breakEvenRevenue);
    const totalKm = this.decimal(dailyProfit.totalKm);
    const activeDuration = dailyProfit.activeMinutes ?? 0;
    const breakEvenProgress = breakEvenTarget.gt(0)
      ? Prisma.Decimal.min(grossIncome.mul(100).div(breakEvenTarget), 100)
      : new Prisma.Decimal(0);
    const warnings = [];

    for (const warning of dailyProfit.calculationWarnings ?? []) {
      warnings.push(warning);
    }

    if (
      totalKm.gt(0) &&
      this.decimal(dailyProfit.fuelCost).lte(0) &&
      this.decimal(dailyProfit.actualFuelPurchaseCost).lte(0)
    ) {
      warnings.push({
        code: 'MISSING_FUEL_PRICE',
        message:
          'Yakıt fiyatı kaydı olmadığı için yakıt maliyeti 0 görünüyor. Tahmini yakıt için en az bir yakıt kaydı ekle.'
      });
    }

    for (const vehicle of vehiclesWithTripsWithoutFuelAssumption) {
      warnings.push({
        code: 'MISSING_VEHICLE_CONSUMPTION',
        message: `${vehicle.plate_number} için yakıt varsayımı eksik. Araç ortalama tüketimini güncelle.`
      });
    }

    return {
      date: periodRange.date,
      startDate: periodRange.startDate,
      endDate: periodRange.endDate,
      todayGrossIncome: dailyProfit.grossIncome,
      todayNetProfit: dailyProfit.netProfit,
      todayTotalExpense: dailyProfit.totalCost,
      fuelCost: dailyProfit.fuelCost,
      packageShare: dailyProfit.tagPackageCost,
      fixedCostShare: dailyProfit.fixedExpenses,
      maintenanceReserve: dailyProfit.maintenanceReserve,
      depreciationCost: dailyProfit.depreciation,
      totalKm: dailyProfit.totalKm,
      activeDuration,
      kmNetProfit:
        totalKm.gt(0) ? kmProfitability.netProfitPerKm : this.money(new Prisma.Decimal(0)),
      hourlyNetProfit:
        activeDuration > 0
          ? hourlyProfitability.netProfitPerHour
          : this.money(new Prisma.Decimal(0)),
      breakEvenTarget: this.money(breakEvenTarget),
      breakEvenProgress: breakEvenProgress.toDecimalPlaces(2).toFixed(2),
      breakEvenRemaining: this.money(
        this.positiveDifference(breakEvenTarget, grossIncome)
      ),
      breakEvenStatus:
        breakEvenTarget.lte(0)
          ? 'NO_TARGET'
          : grossIncome.gte(breakEvenTarget)
            ? 'REACHED'
            : 'IN_PROGRESS',
      recentTrips: recentTrips.map((trip) => ({
        id: trip.id,
        tripDate: trip.trip_date,
        startedAt: trip.started_at,
        pickupLocation: trip.pickup_location,
        dropoffLocation: trip.dropoff_location,
        totalKm: trip.total_km.toFixed(2),
        grossIncome: trip.total_income.toFixed(2),
        netProfit: trip.true_net_profit.toFixed(2)
      })),
      expenseImpact: this.buildExpenseImpact(dailyProfit),
      shiftSummary: this.buildShiftSummary(shifts, dailyProfit),
      warnings,
      hasData:
        dailyProfit.tripCount > 0 ||
        dailyProfit.directExpenseCount > 0 ||
        dailyProfit.actualFuelEntryCount > 0 ||
        dailyProfit.recurringExpenseCount > 0 ||
        dailyProfit.activePackageCount > 0,
      source: {
        period: 'daily',
        dateField: 'trip_date / expense_date / started_at',
        api: '/reports/overview'
      }
    };
  }

  private buildExpenseImpact(
    dailyProfit: Awaited<ReturnType<ReportsService['calculateDailyProfit']>>
  ) {
    const rows = [
      {
        key: 'fuelCost',
        label: 'Yakıt',
        amount: this.decimal(dailyProfit.fuelCost)
      },
      {
        key: 'packageShare',
        label: 'Paket payı',
        amount: this.decimal(dailyProfit.tagPackageCost)
      },
      {
        key: 'fixedCostShare',
        label: 'Sabit gider',
        amount: this.decimal(dailyProfit.fixedExpenses)
      },
      {
        key: 'maintenanceReserve',
        label: 'Bakım rezervi',
        amount: this.decimal(dailyProfit.maintenanceReserve)
      },
      {
        key: 'depreciationCost',
        label: 'Amortisman',
        amount: this.decimal(dailyProfit.depreciation)
      },
      {
        key: 'variableExpenses',
        label: 'Değişken gider',
        amount: this.decimal(dailyProfit.variableExpenses)
      }
    ];
    const total = rows.reduce(
      (sum, row) => sum.plus(row.amount),
      new Prisma.Decimal(0)
    );

    return rows
      .filter((row) => row.amount.gt(0))
      .map((row) => ({
        key: row.key,
        label: row.label,
        amount: this.money(row.amount),
        percentage: total.gt(0)
          ? Prisma.Decimal.min(row.amount.mul(100).div(total), 100)
              .toDecimalPlaces(0)
              .toNumber()
          : 0
      }));
  }

  private buildShiftSummary(
    shifts: Array<{
      active_minutes: number | null;
      ended_at: Date | null;
      id: string;
      started_at: Date;
      status: string;
      total_km: Prisma.Decimal | null;
    }>,
    dailyProfit: Awaited<ReturnType<ReportsService['calculateDailyProfit']>>
  ) {
    const activeShift = shifts.find((shift) => shift.status === 'ACTIVE');
    const activeMinutes =
      dailyProfit.activeMinutes ??
      shifts.reduce((sum, shift) => sum + (shift.active_minutes ?? 0), 0);

    return {
      activeShiftId: activeShift?.id ?? null,
      status: activeShift ? 'ACTIVE' : shifts.length > 0 ? 'COMPLETED' : 'NONE',
      startedAt: activeShift?.started_at ?? shifts[0]?.started_at ?? null,
      endedAt: activeShift?.ended_at ?? shifts[0]?.ended_at ?? null,
      activeMinutes,
      totalKm: dailyProfit.totalKm,
      tripCount: dailyProfit.tripCount,
      shiftCount: dailyProfit.shiftCount
    };
  }

  private buildReportCacheKey(
    userId: string,
    reportType: string,
    query: object
  ) {
    const normalizedQuery = Object.entries(query)
      .filter(([, value]) => value !== undefined && value !== '')
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

    return [
      'reports',
      this.calculationVersion,
      userId,
      reportType,
      JSON.stringify(normalizedQuery)
    ].join(':');
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
    const recurringCosts = await this.calculateRecurringExpenseBuckets(
      userId,
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
    const periodNetProfit =
      this.financeCalculationEngine.calculatePeriodNetProfit({
        costs: {
          depreciationCost: depreciation,
          fixedCostShare: fixedExpenses,
          fuelCost: estimatedFuelCost,
          maintenanceReserve,
          packageShare: packageCost,
          variableCostShare: variableExpenses
        },
        grossIncome
      });
    const totalCost = periodNetProfit.value.totalCost;
    const netProfit = periodNetProfit.value.netProfit;
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
      kmProfit: this.money(
        this.financeCalculationEngine.calculateKmNetProfit({
          netProfit,
          totalKm
        }).value
      ),
      hourlyProfit: this.money(
        this.financeCalculationEngine.calculateHourlyNetProfit({
          activeMinutes,
          netProfit
        }).value
      ),
      totalKm: totalKm.toFixed(2),
      activeMinutes,
      tripCount: tripAggregate._count._all,
      shiftCount: shiftAggregate._count._all,
      directExpenseCount: directExpenses.length,
      recurringExpenseCount: recurringExpenses.length,
      activePackageCount: activePackages.length,
      actualFuelPurchaseCost: this.money(
        this.decimal(fuelAggregate._sum.amount)
      ),
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
        netProfit: periodNetProfit.formulaDescription,
        fuelCost:
          'estimated consumption from recorded trip km; actual fuel purchases are reported separately',
        tagPackageCost:
          'period active package allocation + direct package expenses + recurring package expenses'
      },
      calculationWarnings: periodNetProfit.warnings,
      calculationVersion: this.calculationVersion
    };
  }

  private calculateDirectExpenseBuckets(expenses: ExpenseEntry[]): CostBuckets {
    return expenses.reduce(
      (buckets, expense) =>
        this.addExpenseToBuckets(buckets, expense.expense_type, expense.amount),
      this.emptyCostBuckets()
    );
  }

  private async calculateRecurringExpenseBuckets(
    userId: string,
    recurringExpenses: RecurringExpense[],
    periodRange: PeriodRange
  ): Promise<CostBuckets> {
    const buckets = this.emptyCostBuckets();

    for (const expense of recurringExpenses) {
      const periodCost = await this.calculateRecurringPeriodCost(
        userId,
        expense,
        periodRange
      );

      this.addExpenseToBuckets(buckets, expense.expense_type, periodCost);
    }

    return buckets;
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
    if (tagPackage.allocation_method === PackageAllocationMethod.DIRECT_EXPENSE) {
      return tagPackage.starts_at >= periodRange.start &&
        tagPackage.starts_at < periodRange.nextStart
        ? tagPackage.amount
        : new Prisma.Decimal(0);
    }

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

    if (
      tagPackage.allocation_method === PackageAllocationMethod.PER_ACTIVE_DAY
    ) {
      const [periodActiveDays, packageActiveDays] = await Promise.all([
        this.countActiveWorkDays(userId, tagPackage.vehicle_id, {
          gte: periodRange.start,
          lt: periodRange.nextStart
        }),
        this.countActiveWorkDays(userId, tagPackage.vehicle_id, {
          gte: tagPackage.starts_at,
          lte: tagPackage.ends_at
        })
      ]);

      if (packageActiveDays === 0) {
        return new Prisma.Decimal(0);
      }

      return tagPackage.amount
        .mul(periodActiveDays)
        .div(packageActiveDays)
        .toDecimalPlaces(2);
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

  private async countActiveWorkDays(
    userId: string,
    vehicleId: string,
    dateRange: Prisma.DateTimeFilter
  ) {
    const activeWorkDayKeys = await this.findActiveWorkDayKeysForRange(
      userId,
      vehicleId,
      dateRange
    );

    return activeWorkDayKeys.size;
  }

  private async findActiveWorkDayKeysForRange(
    userId: string,
    vehicleId: string,
    dateRange: Prisma.DateTimeFilter
  ) {
    const [trips, shifts] = await Promise.all([
      this.prisma.trip.findMany({
        where: {
          user_id: userId,
          vehicle_id: vehicleId,
          deleted_at: null,
          trip_date: dateRange
        },
        select: {
          trip_date: true
        }
      }),
      this.prisma.shift.findMany({
        where: {
          user_id: userId,
          vehicle_id: vehicleId,
          started_at: dateRange
        },
        select: {
          started_at: true
        }
      })
    ]);

    return new Set([
      ...trips.map((trip) => this.dayKey(trip.trip_date)),
      ...shifts.map((shift) => this.dayKey(shift.started_at))
    ]);
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

  private async calculateRecurringPeriodCost(
    userId: string,
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

    if (expense.allocation_method === FixedCostAllocationMethod.ACTIVE_DAY) {
      return this.calculateRecurringActiveDayCost(
        userId,
        expense,
        periodRange,
        coveredDays
      );
    }

    if (expense.allocation_method === FixedCostAllocationMethod.PER_KM) {
      return this.calculateRecurringPerKmCost(userId, expense, coveredDays);
    }

    return this.calculateRecurringCalendarDayCost(expense, coveredDays);
  }

  private calculateRecurringCalendarDayCost(
    expense: RecurringExpense,
    coveredDays: Date[]
  ) {
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

  private async calculateRecurringActiveDayCost(
    userId: string,
    expense: RecurringExpense,
    periodRange: PeriodRange,
    coveredDays: Date[]
  ) {
    const activeDayKeys = await this.findActiveWorkDayKeys(
      userId,
      expense.vehicle_id,
      periodRange
    );
    const activeCoveredDays = coveredDays.filter((day) =>
      activeDayKeys.has(this.dayKey(day))
    );

    return this.calculateRecurringCalendarDayCost(expense, activeCoveredDays);
  }

  private async calculateRecurringPerKmCost(
    userId: string,
    expense: RecurringExpense,
    coveredDays: Date[]
  ) {
    let total = new Prisma.Decimal(0);

    for (const group of this.groupCoveredDaysByRecurringCycle(
      expense.period,
      coveredDays
    )) {
      const cycleRange = this.resolveRecurringCycleRange(
        expense.period,
        group.days[0]
      );
      const coveredRange = this.clampRangeToExpense(
        {
          start: group.days[0],
          nextStart: this.nextUtcDayStart(group.days[group.days.length - 1])
        },
        expense
      );
      const denominatorRange = this.clampRangeToExpense(cycleRange, expense);

      if (
        coveredRange.start >= coveredRange.nextStart ||
        denominatorRange.start >= denominatorRange.nextStart
      ) {
        continue;
      }

      const [coveredKm, denominatorKm] = await Promise.all([
        this.sumTripKm(userId, expense.vehicle_id, {
          gte: coveredRange.start,
          lt: coveredRange.nextStart
        }),
        this.sumTripKm(userId, expense.vehicle_id, {
          gte: denominatorRange.start,
          lt: denominatorRange.nextStart
        })
      ]);

      if (denominatorKm.lte(0)) {
        continue;
      }

      total = total.plus(expense.amount.mul(coveredKm).div(denominatorKm));
    }

    return total.toDecimalPlaces(2);
  }

  private async findActiveWorkDayKeys(
    userId: string,
    vehicleId: string,
    periodRange: PeriodRange
  ) {
    const [trips, shifts] = await Promise.all([
      this.prisma.trip.findMany({
        where: {
          user_id: userId,
          vehicle_id: vehicleId,
          deleted_at: null,
          trip_date: {
            gte: periodRange.start,
            lt: periodRange.nextStart
          }
        },
        select: {
          trip_date: true
        }
      }),
      this.prisma.shift.findMany({
        where: {
          user_id: userId,
          vehicle_id: vehicleId,
          started_at: {
            gte: periodRange.start,
            lt: periodRange.nextStart
          }
        },
        select: {
          started_at: true
        }
      })
    ]);

    return new Set([
      ...trips.map((trip) => this.dayKey(trip.trip_date)),
      ...shifts.map((shift) => this.dayKey(shift.started_at))
    ]);
  }

  private groupCoveredDaysByRecurringCycle(
    period: AllocationType,
    coveredDays: Date[]
  ) {
    const grouped = new Map<string, Date[]>();

    for (const day of coveredDays) {
      const key = this.recurringCycleKey(period, day);
      const group = grouped.get(key) ?? [];

      group.push(day);
      grouped.set(key, group);
    }

    return [...grouped.entries()].map(([key, days]) => ({
      days,
      key
    }));
  }

  private recurringCycleKey(period: AllocationType, day: Date) {
    if (period === AllocationType.YEARLY) {
      return `${day.getUTCFullYear()}`;
    }

    if (period === AllocationType.MONTHLY) {
      return `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(
        2,
        '0'
      )}`;
    }

    return this.dayKey(day);
  }

  private resolveRecurringCycleRange(period: AllocationType, day: Date) {
    if (period === AllocationType.YEARLY) {
      const start = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
      const nextStart = new Date(Date.UTC(day.getUTCFullYear() + 1, 0, 1));

      return {
        nextStart,
        start
      };
    }

    if (period === AllocationType.MONTHLY) {
      const start = new Date(
        Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1)
      );
      const nextStart = new Date(
        Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 1)
      );

      return {
        nextStart,
        start
      };
    }

    return {
      nextStart: this.nextUtcDayStart(day),
      start: this.startOfUtcDay(day)
    };
  }

  private clampRangeToExpense(
    range: {
      nextStart: Date;
      start: Date;
    },
    expense: RecurringExpense
  ) {
    return {
      nextStart: this.minDate(
        range.nextStart,
        expense.ends_at ? this.nextUtcDayStart(expense.ends_at) : range.nextStart
      ),
      start: this.maxDate(range.start, this.startOfUtcDay(expense.starts_at))
    };
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

  private resolveWeekRange(
    dateValue?: string,
    snapToMonday = true
  ): PeriodRange {
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

  private dayKey(date: Date) {
    return this.startOfUtcDay(date).toISOString().slice(0, 10);
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

    return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  }

  private money(value: Prisma.Decimal) {
    return value.toDecimalPlaces(2).toFixed(2);
  }
}

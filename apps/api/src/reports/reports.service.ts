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
import { DailyProfitQueryDto } from './dto/daily-profit-query.dto';

interface DayRange {
  date: string;
  nextStart: Date;
  start: Date;
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
  readonly calculationVersion = 'daily-profit-v1';

  constructor(private readonly prisma: PrismaService) {}

  async calculateDailyProfit(userId: string, query: DailyProfitQueryDto) {
    const dayRange = this.resolveDayRange(query.date);
    const vehicleFilter = query.vehicleId
      ? {
          vehicle_id: query.vehicleId
        }
      : {};
    const tripWhere: Prisma.TripWhereInput = {
      user_id: userId,
      deleted_at: null,
      trip_date: {
        gte: dayRange.start,
        lt: dayRange.nextStart
      },
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
          started_at: {
            gte: dayRange.start,
            lt: dayRange.nextStart
          },
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
          expense_date: {
            gte: dayRange.start,
            lt: dayRange.nextStart
          },
          ...vehicleFilter
        }
      }),
      this.prisma.fuelEntry.aggregate({
        where: {
          user_id: userId,
          deleted_at: null,
          created_at: {
            gte: dayRange.start,
            lt: dayRange.nextStart
          },
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
            lt: dayRange.nextStart
          },
          OR: [
            {
              ends_at: null
            },
            {
              ends_at: {
                gte: dayRange.start
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
            lt: dayRange.nextStart
          },
          ends_at: {
            gte: dayRange.start
          },
          ...vehicleFilter
        }
      })
    ]);

    const directCosts = this.calculateDirectExpenseBuckets(directExpenses);
    const recurringCosts = this.calculateRecurringExpenseBuckets(
      recurringExpenses,
      dayRange.start
    );
    const tagPackageCost = await this.calculateTagPackageCostForDay(
      userId,
      activePackages,
      dayRange
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
      date: dayRange.date,
      vehicleId: query.vehicleId ?? null,
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
          'daily active package allocation + direct package expenses + recurring package expenses'
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
    reportDate: Date
  ): CostBuckets {
    return recurringExpenses.reduce((buckets, expense) => {
      const dailyCost = this.calculateRecurringDailyCost(expense, reportDate);

      return this.addExpenseToBuckets(
        buckets,
        expense.expense_type,
        dailyCost
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

  private async calculateTagPackageCostForDay(
    userId: string,
    activePackages: TagPackage[],
    dayRange: DayRange
  ) {
    const costs = await Promise.all(
      activePackages.map((tagPackage) =>
        this.calculateTagPackageLineForDay(userId, tagPackage, dayRange)
      )
    );

    return costs.reduce(
      (total, cost) => total.plus(cost),
      new Prisma.Decimal(0)
    );
  }

  private async calculateTagPackageLineForDay(
    userId: string,
    tagPackage: TagPackage,
    dayRange: DayRange
  ) {
    if (tagPackage.allocation_method === PackageAllocationMethod.PER_TRIP) {
      const [dailyTripCount, packageTripCount] = await Promise.all([
        this.prisma.trip.count({
          where: {
            user_id: userId,
            vehicle_id: tagPackage.vehicle_id,
            deleted_at: null,
            trip_date: {
              gte: dayRange.start,
              lt: dayRange.nextStart
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
        .mul(dailyTripCount)
        .div(packageTripCount)
        .toDecimalPlaces(2);
    }

    if (tagPackage.allocation_method === PackageAllocationMethod.PER_KM) {
      const [dailyKm, packageKm] = await Promise.all([
        this.sumTripKm(userId, tagPackage.vehicle_id, {
          gte: dayRange.start,
          lt: dayRange.nextStart
        }),
        this.sumTripKm(userId, tagPackage.vehicle_id, {
          gte: tagPackage.starts_at,
          lte: tagPackage.ends_at
        })
      ]);

      if (packageKm.lte(0)) {
        return new Prisma.Decimal(0);
      }

      return tagPackage.amount.mul(dailyKm).div(packageKm).toDecimalPlaces(2);
    }

    return tagPackage.amount
      .div(Math.max(tagPackage.duration_days, 1))
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

  private calculateRecurringDailyCost(
    expense: RecurringExpense,
    reportDate: Date
  ) {
    if (expense.period === AllocationType.DAILY) {
      return expense.amount;
    }

    if (expense.period === AllocationType.YEARLY) {
      return expense.amount.div(this.daysInYear(reportDate)).toDecimalPlaces(2);
    }

    if (expense.period === AllocationType.MONTHLY) {
      return expense.amount
        .div(this.daysInMonth(reportDate))
        .toDecimalPlaces(2);
    }

    return expense.amount;
  }

  private resolveDayRange(dateValue?: string): DayRange {
    const date = dateValue ? new Date(dateValue) : new Date();

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date value.');
    }

    const start = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    );
    const nextStart = new Date(start);

    nextStart.setUTCDate(nextStart.getUTCDate() + 1);

    return {
      date: start.toISOString().slice(0, 10),
      nextStart,
      start
    };
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

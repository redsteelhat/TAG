import { BadRequestException, Injectable, Optional } from "@nestjs/common";
import { Prisma, Vehicle } from "@prisma/client";
import {
  CalculationWarning,
  FinanceCalculationEngine,
} from "../finance-calculation/finance-calculation.engine";
import { FuelCostService } from "../fuel-cost/fuel-cost.service";
import { PackageAllocationService } from "../package-allocation/package-allocation.service";
import { PrismaService } from "../prisma/prisma.service";

export interface TripIncomeCalculationInput {
  cancellationIncome?: string | Prisma.Decimal | null;
  currentTripId?: string | null;
  deadheadKm?: string | Prisma.Decimal | null;
  durationMinutes?: number | null;
  endedAt?: Date | null;
  grossIncome: string | Prisma.Decimal;
  startedAt?: Date | null;
  tipAmount?: string | Prisma.Decimal | null;
  tripDate?: string | Date | null;
  tripKm?: string | Prisma.Decimal | null;
}

export interface TripIncomeCalculationResult {
  allocatedDepreciationCost: Prisma.Decimal;
  allocatedFixedCost: Prisma.Decimal;
  allocatedMaintenanceCost: Prisma.Decimal;
  allocatedOtherVariableCost: Prisma.Decimal;
  allocatedPackageCost: Prisma.Decimal;
  cashNetProfit: Prisma.Decimal;
  calculationWarnings: CalculationWarning[];
  durationMinutes: number | null;
  estimatedFuelCost: Prisma.Decimal;
  formulaDescription: string;
  totalIncome: Prisma.Decimal;
  totalKm: Prisma.Decimal;
  trueNetProfit: Prisma.Decimal;
}

export interface TripProfitBreakdownSnapshot {
  allocated_depreciation_cost: Prisma.Decimal;
  allocated_fixed_cost: Prisma.Decimal;
  allocated_maintenance_cost: Prisma.Decimal;
  allocated_other_variable_cost: Prisma.Decimal;
  allocated_package_cost: Prisma.Decimal;
  cancellation_income: Prisma.Decimal;
  cash_net_profit: Prisma.Decimal;
  estimated_fuel_cost: Prisma.Decimal;
  gross_income: Prisma.Decimal;
  tip_amount: Prisma.Decimal;
  total_income: Prisma.Decimal;
  total_km: Prisma.Decimal;
  true_net_profit: Prisma.Decimal;
}

@Injectable()
export class IncomeCalculationService {
  readonly calculationVersion = "income-calculation-v1";

  constructor(
    private readonly financeCalculationEngine: FinanceCalculationEngine,
    private readonly fuelCostService: FuelCostService,
    private readonly packageAllocationService: PackageAllocationService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  async calculateTripIncome(
    userId: string,
    vehicle: Vehicle,
    input: TripIncomeCalculationInput,
  ): Promise<TripIncomeCalculationResult> {
    const zero = new Prisma.Decimal(0);
    const grossIncome = this.toDecimal(input.grossIncome);
    const tipAmount = this.toDecimal(input.tipAmount ?? "0");
    const cancellationIncome = this.toDecimal(input.cancellationIncome ?? "0");
    const tripKm = this.toDecimal(input.tripKm ?? "0");
    const deadheadKm = this.toDecimal(input.deadheadKm ?? "0");
    const totalKm = tripKm.plus(deadheadKm);
    const durationMinutes = this.resolveDurationMinutes(
      input.startedAt,
      input.endedAt,
      input.durationMinutes ?? null,
    );
    const estimatedFuelCost = await this.calculateEstimatedFuelCost(
      userId,
      vehicle,
      totalKm,
    );
    const packageAllocation =
      await this.packageAllocationService.calculateTripPackageCost({
        currentTripId: input.currentTripId,
        totalKm,
        tripDate: this.resolveTripDate(input.tripDate, input.startedAt),
        userId,
        vehicleId: vehicle.id,
      });
    const allocatedPackageCost = packageAllocation.totalAllocatedPackageCost;
    const allocatedFixedCost = zero;
    const allocatedMaintenanceCost = await this.calculateMaintenanceCost(
      userId,
      vehicle,
      totalKm,
      this.resolveTripDate(input.tripDate, input.startedAt),
    );
    const allocatedDepreciationCost = await this.calculateDepreciationCost(
      userId,
      vehicle,
      totalKm,
      {
        currentTripId: input.currentTripId,
        tripDate: this.resolveTripDate(input.tripDate, input.startedAt),
      },
    );
    const allocatedOtherVariableCost = zero;
    const cashNetProfitResult =
      this.financeCalculationEngine.calculateTripNetProfit({
        cancellationIncome,
        costs: {
          fuelCost: estimatedFuelCost,
        },
        grossIncome,
        tipAmount,
      });
    const trueNetProfitResult =
      this.financeCalculationEngine.calculateTripNetProfit({
        cancellationIncome,
        costs: {
          depreciationCost: allocatedDepreciationCost,
          fixedCostShare: allocatedFixedCost,
          fuelCost: estimatedFuelCost,
          maintenanceReserve: allocatedMaintenanceCost,
          packageShare: allocatedPackageCost,
          variableCostShare: allocatedOtherVariableCost,
        },
        grossIncome,
        tipAmount,
      });

    return {
      allocatedDepreciationCost,
      allocatedFixedCost,
      allocatedMaintenanceCost,
      allocatedOtherVariableCost,
      allocatedPackageCost,
      calculationWarnings: trueNetProfitResult.warnings,
      cashNetProfit: cashNetProfitResult.value.netProfit,
      durationMinutes,
      estimatedFuelCost,
      formulaDescription: trueNetProfitResult.formulaDescription,
      totalIncome: trueNetProfitResult.value.totalIncome,
      totalKm,
      trueNetProfit: trueNetProfitResult.value.netProfit,
    };
  }

  buildTripProfitBreakdown(trip: TripProfitBreakdownSnapshot) {
    return {
      grossIncome: trip.gross_income.toFixed(2),
      tipAmount: trip.tip_amount.toFixed(2),
      cancellationIncome: trip.cancellation_income.toFixed(2),
      totalIncome: trip.total_income.toFixed(2),
      totalKm: trip.total_km.toFixed(2),
      fuelCost: trip.estimated_fuel_cost.toFixed(2),
      packageCost: trip.allocated_package_cost.toFixed(2),
      fixedCost: trip.allocated_fixed_cost.toFixed(2),
      maintenanceCost: trip.allocated_maintenance_cost.toFixed(2),
      depreciationCost: trip.allocated_depreciation_cost.toFixed(2),
      otherVariableCost: trip.allocated_other_variable_cost.toFixed(2),
      cashNetProfit: trip.cash_net_profit.toFixed(2),
      trueNetProfit: trip.true_net_profit.toFixed(2),
      method: {
        totalIncome: "gross_plus_tip_plus_cancellation",
        fuel: "latest_fuel_price_x_vehicle_average_consumption_x_total_km",
        package: "active_tag_packages_allocated_by_package_method",
        fixedCost: "placeholder_zero_until_fixed_cost_allocation_service",
        maintenance: "latest_maintenance_cost_per_km_x_total_km",
        depreciation: "vehicle_depreciation_settings",
        otherVariable:
          "placeholder_zero_until_variable_expense_allocation_service",
      },
      placeholderCosts: ["fixedCost", "otherVariableCost"],
      formulaDescription:
        this.financeCalculationEngine.netProfitFormulaDescription,
      calculationVersion: this.calculationVersion,
    };
  }

  resolveDurationMinutes(
    startedAt?: Date | null,
    endedAt?: Date | null,
    fallback?: number | null,
  ) {
    if (!startedAt || !endedAt) {
      return fallback ?? null;
    }

    const durationMinutes = Math.round(
      (endedAt.getTime() - startedAt.getTime()) / 60000,
    );

    if (durationMinutes < 0) {
      throw new BadRequestException("Trip end time must be after start time.");
    }

    return durationMinutes;
  }

  async calculateEstimatedFuelCost(
    userId: string,
    vehicle: Vehicle,
    totalKm: Prisma.Decimal,
  ) {
    const fuelCost = await this.fuelCostService.calculateTripFuelCost(
      userId,
      vehicle,
      totalKm,
    );

    return fuelCost.estimatedFuelCost;
  }

  async calculateDepreciationCost(
    _userId: string,
    vehicle: Vehicle,
    totalKm: Prisma.Decimal,
    input: {
      currentTripId?: string | null;
      tripDate: Date;
    },
  ) {
    return this.financeCalculationEngine.calculateDepreciation({
      date: input.tripDate,
      depreciationEnabled: vehicle.depreciation_enabled,
      model: vehicle.depreciation_model,
      showInProfit: true,
      totalKm,
      yearlyEstimatedKm: vehicle.annual_estimated_km,
      yearlyValueLoss: vehicle.annual_depreciation_amount,
    }).value;
  }

  async calculateMaintenanceCost(
    userId: string,
    vehicle: Vehicle,
    totalKm: Prisma.Decimal,
    tripDate: Date,
  ) {
    if (
      !this.prisma ||
      totalKm.lte(0) ||
      !(this.prisma as unknown as { maintenanceEntry?: unknown })
        .maintenanceEntry
    ) {
      return new Prisma.Decimal(0);
    }

    const maintenanceEntries = await this.prisma.maintenanceEntry.findMany({
      where: {
        user_id: userId,
        vehicle_id: vehicle.id,
        deleted_at: null,
        cost_per_km: {
          not: null,
        },
        expected_interval_km: {
          not: null,
        },
        maintenance_date: {
          lte: tripDate,
        },
      },
      orderBy: [
        {
          maintenance_date: "desc",
        },
        {
          created_at: "desc",
        },
      ],
    });
    const latestMaintenancePlans = new Map<string, Prisma.Decimal>();

    for (const entry of maintenanceEntries) {
      if (!entry.cost_per_km) {
        continue;
      }

      const planKey = [
        entry.category.trim().toLocaleLowerCase("tr-TR"),
        entry.title.trim().toLocaleLowerCase("tr-TR"),
      ].join(":");

      if (!latestMaintenancePlans.has(planKey)) {
        latestMaintenancePlans.set(planKey, entry.cost_per_km);
      }
    }

    const maintenanceCostPerKm = [...latestMaintenancePlans.values()].reduce(
      (total, costPerKm) => total.plus(costPerKm),
      new Prisma.Decimal(0),
    );

    return maintenanceCostPerKm.mul(totalKm).toDecimalPlaces(2);
  }

  private resolveTripDate(
    tripDate?: string | Date | null,
    startedAt?: Date | null,
  ) {
    if (tripDate instanceof Date) {
      return tripDate;
    }

    if (tripDate) {
      const date = new Date(tripDate);

      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException("Invalid trip date value.");
      }

      return date;
    }

    return startedAt ?? new Date();
  }

  private toDecimal(value: string | Prisma.Decimal) {
    return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  }
}

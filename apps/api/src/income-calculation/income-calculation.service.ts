import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { DepreciationModel, Prisma, Vehicle } from '@prisma/client';
import { FuelCostService } from '../fuel-cost/fuel-cost.service';
import { PackageAllocationService } from '../package-allocation/package-allocation.service';
import { PrismaService } from '../prisma/prisma.service';

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
  durationMinutes: number | null;
  estimatedFuelCost: Prisma.Decimal;
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
  readonly calculationVersion = 'income-calculation-v1';

  constructor(
    private readonly fuelCostService: FuelCostService,
    private readonly packageAllocationService: PackageAllocationService,
    @Optional() private readonly prisma?: PrismaService
  ) {}

  async calculateTripIncome(
    userId: string,
    vehicle: Vehicle,
    input: TripIncomeCalculationInput
  ): Promise<TripIncomeCalculationResult> {
    const zero = new Prisma.Decimal(0);
    const grossIncome = this.toDecimal(input.grossIncome);
    const tipAmount = this.toDecimal(input.tipAmount ?? '0');
    const cancellationIncome = this.toDecimal(input.cancellationIncome ?? '0');
    const tripKm = this.toDecimal(input.tripKm ?? '0');
    const deadheadKm = this.toDecimal(input.deadheadKm ?? '0');
    const totalIncome = grossIncome.plus(tipAmount).plus(cancellationIncome);
    const totalKm = tripKm.plus(deadheadKm);
    const durationMinutes = this.resolveDurationMinutes(
      input.startedAt,
      input.endedAt,
      input.durationMinutes ?? null
    );
    const estimatedFuelCost = await this.calculateEstimatedFuelCost(
      userId,
      vehicle,
      totalKm
    );
    const packageAllocation =
      await this.packageAllocationService.calculateTripPackageCost({
        currentTripId: input.currentTripId,
        totalKm,
        tripDate: this.resolveTripDate(input.tripDate, input.startedAt),
        userId,
        vehicleId: vehicle.id
      });
    const allocatedPackageCost =
      packageAllocation.totalAllocatedPackageCost;
    const allocatedFixedCost = zero;
    const allocatedMaintenanceCost = zero;
    const allocatedDepreciationCost = await this.calculateDepreciationCost(
      userId,
      vehicle,
      totalKm,
      {
        currentTripId: input.currentTripId,
        tripDate: this.resolveTripDate(input.tripDate, input.startedAt)
      }
    );
    const allocatedOtherVariableCost = zero;
    const cashNetProfit = totalIncome.minus(estimatedFuelCost);
    const trueNetProfit = cashNetProfit
      .minus(allocatedPackageCost)
      .minus(allocatedFixedCost)
      .minus(allocatedMaintenanceCost)
      .minus(allocatedDepreciationCost)
      .minus(allocatedOtherVariableCost);

    return {
      allocatedDepreciationCost,
      allocatedFixedCost,
      allocatedMaintenanceCost,
      allocatedOtherVariableCost,
      allocatedPackageCost,
      cashNetProfit,
      durationMinutes,
      estimatedFuelCost,
      totalIncome,
      totalKm,
      trueNetProfit
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
        totalIncome: 'gross_plus_tip_plus_cancellation',
        fuel: 'latest_fuel_price_x_vehicle_average_consumption_x_total_km',
        package: 'active_tag_packages_allocated_by_package_method',
        fixedCost: 'placeholder_zero_until_fixed_cost_allocation_service',
        maintenance:
          'placeholder_zero_until_maintenance_reserve_allocation_service',
        depreciation: 'vehicle_depreciation_settings',
        otherVariable:
          'placeholder_zero_until_variable_expense_allocation_service'
      },
      placeholderCosts: [
        'fixedCost',
        'maintenanceCost',
        'otherVariableCost'
      ],
      calculationVersion: this.calculationVersion
    };
  }

  resolveDurationMinutes(
    startedAt?: Date | null,
    endedAt?: Date | null,
    fallback?: number | null
  ) {
    if (!startedAt || !endedAt) {
      return fallback ?? null;
    }

    const durationMinutes = Math.round(
      (endedAt.getTime() - startedAt.getTime()) / 60000
    );

    if (durationMinutes < 0) {
      throw new BadRequestException('Trip end time must be after start time.');
    }

    return durationMinutes;
  }

  async calculateEstimatedFuelCost(
    userId: string,
    vehicle: Vehicle,
    totalKm: Prisma.Decimal
  ) {
    const fuelCost = await this.fuelCostService.calculateTripFuelCost(
      userId,
      vehicle,
      totalKm
    );

    return fuelCost.estimatedFuelCost;
  }

  async calculateDepreciationCost(
    userId: string,
    vehicle: Vehicle,
    totalKm: Prisma.Decimal,
    input: {
      currentTripId?: string | null;
      tripDate: Date;
    }
  ) {
    if (!vehicle.depreciation_enabled) {
      return new Prisma.Decimal(0);
    }

    if (!(await this.shouldShowDepreciationInProfit(userId))) {
      return new Prisma.Decimal(0);
    }

    const annualDepreciation = this.toDecimal(
      vehicle.annual_depreciation_amount ?? '0'
    );

    if (annualDepreciation.lte(0)) {
      return new Prisma.Decimal(0);
    }

    if (vehicle.depreciation_model === DepreciationModel.PER_KM) {
      const annualEstimatedKm = this.toDecimal(
        vehicle.annual_estimated_km ?? '0'
      );

      if (annualEstimatedKm.lte(0)) {
        return new Prisma.Decimal(0);
      }

      return annualDepreciation
        .div(annualEstimatedKm)
        .mul(totalKm)
        .toDecimalPlaces(2);
    }

    if (vehicle.depreciation_model === DepreciationModel.MONTHLY) {
      const monthlyDepreciation = annualDepreciation.div(12);
      const monthlyTripCount = await this.countTripsInMonth(
        userId,
        vehicle.id,
        input.tripDate,
        input.currentTripId
      );

      return monthlyDepreciation
        .div(Math.max(monthlyTripCount + 1, 1))
        .toDecimalPlaces(2);
    }

    return new Prisma.Decimal(0);
  }

  private async shouldShowDepreciationInProfit(userId: string) {
    if (!this.prisma) {
      return true;
    }

    const profile = await this.prisma.driverProfile.findUnique({
      where: {
        user_id: userId
      },
      select: {
        show_depreciation_in_profit: true
      }
    });

    return profile?.show_depreciation_in_profit ?? true;
  }

  private async countTripsInMonth(
    userId: string,
    vehicleId: string,
    tripDate: Date,
    currentTripId?: string | null
  ) {
    if (!this.prisma) {
      return 0;
    }

    const start = new Date(
      Date.UTC(tripDate.getUTCFullYear(), tripDate.getUTCMonth(), 1)
    );
    const nextStart = new Date(
      Date.UTC(tripDate.getUTCFullYear(), tripDate.getUTCMonth() + 1, 1)
    );

    return this.prisma.trip.count({
      where: {
        id: currentTripId
          ? {
              not: currentTripId
            }
          : undefined,
        user_id: userId,
        vehicle_id: vehicleId,
        deleted_at: null,
        trip_date: {
          gte: start,
          lt: nextStart
        }
      }
    });
  }

  private resolveTripDate(
    tripDate?: string | Date | null,
    startedAt?: Date | null
  ) {
    if (tripDate instanceof Date) {
      return tripDate;
    }

    if (tripDate) {
      const date = new Date(tripDate);

      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException('Invalid trip date value.');
      }

      return date;
    }

    return startedAt ?? new Date();
  }

  private toDecimal(value: string | Prisma.Decimal) {
    return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  }
}

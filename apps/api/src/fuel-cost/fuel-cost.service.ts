import { Injectable } from '@nestjs/common';
import { FuelEntry, Prisma, Vehicle } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface FuelCostCalculationResult {
  averageConsumptionLPer100Km: string;
  estimatedFuelCost: Prisma.Decimal;
  estimatedLiters: Prisma.Decimal;
  fuelCostPerKm: Prisma.Decimal;
  latestFuelEntryId: string | null;
  latestFuelPricePerLiter: Prisma.Decimal;
  method: 'latest_fuel_price_x_vehicle_average_consumption_x_total_km';
  totalKm: Prisma.Decimal;
}

@Injectable()
export class FuelCostService {
  readonly calculationVersion = 'fuel-cost-v1';

  constructor(private readonly prisma: PrismaService) {}

  async calculateTripFuelCost(
    userId: string,
    vehicle: Vehicle,
    totalKmValue: string | Prisma.Decimal
  ): Promise<FuelCostCalculationResult> {
    const totalKm = this.toDecimal(totalKmValue);
    const latestFuelEntry = await this.findLatestFuelEntry(userId, vehicle.id);
    const latestFuelPricePerLiter =
      latestFuelEntry?.price_per_liter ?? new Prisma.Decimal(0);
    const estimatedLiters = this.calculateEstimatedLiters(
      totalKm,
      vehicle.average_consumption_l_per_100km
    );
    const fuelCostPerKm = this.calculateFuelCostPerKm(
      vehicle.average_consumption_l_per_100km,
      latestFuelPricePerLiter
    );
    const estimatedFuelCost = estimatedLiters
      .mul(latestFuelPricePerLiter)
      .toDecimalPlaces(2);

    return {
      averageConsumptionLPer100Km:
        vehicle.average_consumption_l_per_100km.toFixed(3),
      estimatedFuelCost,
      estimatedLiters,
      fuelCostPerKm,
      latestFuelEntryId: latestFuelEntry?.id ?? null,
      latestFuelPricePerLiter,
      method: 'latest_fuel_price_x_vehicle_average_consumption_x_total_km',
      totalKm
    };
  }

  calculateFuelCostPerKm(
    averageConsumptionLPer100KmValue: string | Prisma.Decimal,
    pricePerLiterValue: string | Prisma.Decimal
  ) {
    const averageConsumptionLPer100Km = this.toDecimal(
      averageConsumptionLPer100KmValue
    );
    const pricePerLiter = this.toDecimal(pricePerLiterValue);

    if (averageConsumptionLPer100Km.isZero() || pricePerLiter.isZero()) {
      return new Prisma.Decimal(0);
    }

    return averageConsumptionLPer100Km.div(100).mul(pricePerLiter);
  }

  calculateEstimatedLiters(
    totalKmValue: string | Prisma.Decimal,
    averageConsumptionLPer100KmValue: string | Prisma.Decimal
  ) {
    const totalKm = this.toDecimal(totalKmValue);
    const averageConsumptionLPer100Km = this.toDecimal(
      averageConsumptionLPer100KmValue
    );

    if (totalKm.isZero() || averageConsumptionLPer100Km.isZero()) {
      return new Prisma.Decimal(0);
    }

    return totalKm.mul(averageConsumptionLPer100Km).div(100);
  }

  async findLatestFuelEntry(userId: string, vehicleId: string) {
    return this.prisma.fuelEntry.findFirst({
      where: {
        user_id: userId,
        vehicle_id: vehicleId,
        deleted_at: null
      },
      orderBy: [
        {
          created_at: 'desc'
        },
        {
          odometer_km: 'desc'
        }
      ]
    }) as Promise<FuelEntry | null>;
  }

  buildFuelCostBreakdown(result: FuelCostCalculationResult) {
    return {
      totalKm: result.totalKm.toFixed(2),
      averageConsumptionLPer100Km: result.averageConsumptionLPer100Km,
      latestFuelPricePerLiter: result.latestFuelPricePerLiter.toFixed(3),
      fuelCostPerKm: result.fuelCostPerKm.toFixed(4),
      estimatedLiters: result.estimatedLiters.toFixed(3),
      estimatedFuelCost: result.estimatedFuelCost.toFixed(2),
      latestFuelEntryId: result.latestFuelEntryId,
      method: result.method,
      calculationVersion: this.calculationVersion
    };
  }

  private toDecimal(value: string | Prisma.Decimal) {
    return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  }
}

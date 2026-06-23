import { BadRequestException } from "@nestjs/common";
import { DepreciationModel, Prisma, Vehicle } from "@prisma/client";
import { FinanceCalculationEngine } from "../finance-calculation/finance-calculation.engine";
import { IncomeCalculationService } from "./income-calculation.service";

const vehicle = {
  average_consumption_l_per_100km: new Prisma.Decimal("7.5"),
  annual_depreciation_amount: null,
  annual_estimated_km: null,
  depreciation_enabled: false,
  depreciation_model: null,
  id: "vehicle_1",
} as Vehicle;

describe("IncomeCalculationService", () => {
  it("calculates trip income, km, duration and fuel cost", async () => {
    const service = new IncomeCalculationService(
      new FinanceCalculationEngine(),
      {
        calculateTripFuelCost: jest.fn().mockResolvedValue({
          estimatedFuelCost: new Prisma.Decimal("66"),
        }),
      } as never,
      {
        calculateTripPackageCost: jest.fn().mockResolvedValue({
          totalAllocatedPackageCost: new Prisma.Decimal("100"),
        }),
      } as never,
    );

    const result = await service.calculateTripIncome("user_1", vehicle, {
      cancellationIncome: "10.00",
      deadheadKm: "4.00",
      endedAt: new Date("2026-06-17T10:47:00+03:00"),
      grossIncome: "450.00",
      startedAt: new Date("2026-06-17T10:15:00+03:00"),
      tipAmount: "20.00",
      tripKm: "18.00",
    });

    expect(result.totalIncome.toFixed(2)).toBe("480.00");
    expect(result.totalKm.toFixed(2)).toBe("22.00");
    expect(result.durationMinutes).toBe(32);
    expect(result.estimatedFuelCost.toFixed(2)).toBe("66.00");
    expect(result.allocatedPackageCost.toFixed(2)).toBe("100.00");
    expect(result.allocatedDepreciationCost.toFixed(2)).toBe("0.00");
    expect(result.cashNetProfit.toFixed(2)).toBe("414.00");
    expect(result.trueNetProfit.toFixed(2)).toBe("314.00");
  });

  it("allocates per-kilometer depreciation from vehicle settings", async () => {
    const service = new IncomeCalculationService(
      new FinanceCalculationEngine(),
      {
        calculateTripFuelCost: jest.fn().mockResolvedValue({
          estimatedFuelCost: new Prisma.Decimal("66"),
        }),
      } as never,
      {
        calculateTripPackageCost: jest.fn().mockResolvedValue({
          totalAllocatedPackageCost: new Prisma.Decimal("100"),
        }),
      } as never,
      {
        driverProfile: {
          findUnique: jest.fn().mockResolvedValue({
            show_depreciation_in_profit: true,
          }),
        },
      } as never,
    );

    const result = await service.calculateTripIncome(
      "user_1",
      {
        ...vehicle,
        annual_depreciation_amount: new Prisma.Decimal("60000"),
        annual_estimated_km: new Prisma.Decimal("30000"),
        depreciation_enabled: true,
        depreciation_model: DepreciationModel.PER_KM,
      } as Vehicle,
      {
        deadheadKm: "4.00",
        grossIncome: "450.00",
        tripDate: "2026-06-17",
        tripKm: "18.00",
      },
    );

    expect(result.totalKm.toFixed(2)).toBe("22.00");
    expect(result.allocatedDepreciationCost.toFixed(2)).toBe("44.00");
    expect(result.trueNetProfit.toFixed(2)).toBe("240.00");
  });

  it("uses vehicle depreciation setting as the single profit source", async () => {
    const service = new IncomeCalculationService(
      new FinanceCalculationEngine(),
      {
        calculateTripFuelCost: jest.fn().mockResolvedValue({
          estimatedFuelCost: new Prisma.Decimal("0"),
        }),
      } as never,
      {
        calculateTripPackageCost: jest.fn().mockResolvedValue({
          totalAllocatedPackageCost: new Prisma.Decimal("0"),
        }),
      } as never,
      {
        driverProfile: {
          findUnique: jest.fn().mockResolvedValue({
            show_depreciation_in_profit: false,
          }),
        },
      } as never,
    );

    const result = await service.calculateTripIncome(
      "user_1",
      {
        ...vehicle,
        annual_depreciation_amount: new Prisma.Decimal("60000"),
        annual_estimated_km: new Prisma.Decimal("30000"),
        depreciation_enabled: true,
        depreciation_model: DepreciationModel.PER_KM,
      } as Vehicle,
      {
        grossIncome: "450.00",
        tripDate: "2026-06-17",
        tripKm: "18.00",
      },
    );

    expect(result.allocatedDepreciationCost.toFixed(2)).toBe("36.00");
    expect(result.trueNetProfit.toFixed(2)).toBe("414.00");
  });

  it("returns zero fuel cost when vehicle has no fuel entry", async () => {
    const service = new IncomeCalculationService(
      new FinanceCalculationEngine(),
      {
        calculateTripFuelCost: jest.fn().mockResolvedValue({
          estimatedFuelCost: new Prisma.Decimal(0),
        }),
      } as never,
      {} as never,
    );

    const result = await service.calculateEstimatedFuelCost(
      "user_1",
      vehicle,
      new Prisma.Decimal("22"),
    );

    expect(result.toFixed(2)).toBe("0.00");
  });

  it("builds a trip-level net profit placeholder breakdown", () => {
    const service = new IncomeCalculationService(
      new FinanceCalculationEngine(),
      {} as never,
      {} as never,
    );
    const breakdown = service.buildTripProfitBreakdown({
      allocated_depreciation_cost: new Prisma.Decimal("0"),
      allocated_fixed_cost: new Prisma.Decimal("0"),
      allocated_maintenance_cost: new Prisma.Decimal("0"),
      allocated_other_variable_cost: new Prisma.Decimal("0"),
      allocated_package_cost: new Prisma.Decimal("0"),
      cancellation_income: new Prisma.Decimal("0"),
      cash_net_profit: new Prisma.Decimal("414"),
      estimated_fuel_cost: new Prisma.Decimal("66"),
      gross_income: new Prisma.Decimal("450"),
      tip_amount: new Prisma.Decimal("30"),
      total_income: new Prisma.Decimal("480"),
      total_km: new Prisma.Decimal("22"),
      true_net_profit: new Prisma.Decimal("414"),
    });

    expect(breakdown.cashNetProfit).toBe("414.00");
    expect(breakdown.trueNetProfit).toBe("414.00");
    expect(breakdown.packageCost).toBe("0.00");
    expect(breakdown.method.depreciation).toBe("vehicle_depreciation_settings");
    expect(breakdown.placeholderCosts).not.toContain("packageCost");
    expect(breakdown.placeholderCosts).not.toContain("depreciationCost");
  });

  it("uses fallback duration when timestamps are missing", () => {
    const service = new IncomeCalculationService(
      new FinanceCalculationEngine(),
      {} as never,
      {} as never,
    );

    expect(service.resolveDurationMinutes(null, null, 45)).toBe(45);
  });

  it("rejects negative trip duration", () => {
    const service = new IncomeCalculationService(
      new FinanceCalculationEngine(),
      {} as never,
      {} as never,
    );

    expect(() =>
      service.resolveDurationMinutes(
        new Date("2026-06-17T10:47:00+03:00"),
        new Date("2026-06-17T10:15:00+03:00"),
        null,
      ),
    ).toThrow(BadRequestException);
  });
});

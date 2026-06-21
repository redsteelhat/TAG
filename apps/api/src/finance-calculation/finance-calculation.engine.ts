import { Injectable } from '@nestjs/common';
import { DepreciationModel, Prisma } from '@prisma/client';

export type CalculationWarningCode =
  | 'DEPRECIATION_DISABLED'
  | 'FIXED_COST_NOT_DEFINED'
  | 'FUEL_PRICE_MISSING'
  | 'MAINTENANCE_NOT_DEFINED'
  | 'PACKAGE_NOT_DEFINED'
  | 'VEHICLE_CONSUMPTION_MISSING';

export interface CalculationWarning {
  code: CalculationWarningCode;
  message: string;
}

export interface FinanceCalculationResult<T> {
  formulaDescription: string;
  value: T;
  warnings: CalculationWarning[];
}

export interface CostInput {
  depreciationCost?: DecimalLike | null;
  fixedCostShare?: DecimalLike | null;
  fuelCost?: DecimalLike | null;
  maintenanceReserve?: DecimalLike | null;
  packageShare?: DecimalLike | null;
  variableCostShare?: DecimalLike | null;
}

type DecimalLike = Prisma.Decimal | string | number;

@Injectable()
export class FinanceCalculationEngine {
  readonly calculationVersion = 'finance-calculation-v1';
  readonly netProfitFormulaDescription =
    'Net kâr = Brüt gelir - yakıt - paket - giderler - bakım - amortisman';

  calculateTripNetProfit(input: {
    cancellationIncome?: DecimalLike | null;
    costs: CostInput;
    grossIncome: DecimalLike;
    tipAmount?: DecimalLike | null;
  }): FinanceCalculationResult<{
    netProfit: Prisma.Decimal;
    totalCost: Prisma.Decimal;
    totalIncome: Prisma.Decimal;
  }> {
    const totalIncome = this.decimal(input.grossIncome)
      .plus(this.decimal(input.tipAmount))
      .plus(this.decimal(input.cancellationIncome));
    const totalCost = this.totalCost(input.costs);

    return {
      formulaDescription: this.netProfitFormulaDescription,
      value: {
        netProfit: totalIncome.minus(totalCost).toDecimalPlaces(2),
        totalCost,
        totalIncome
      },
      warnings: this.costWarnings(input.costs)
    };
  }

  calculatePeriodNetProfit(input: {
    costs: CostInput;
    grossIncome: DecimalLike;
  }): FinanceCalculationResult<{
    netProfit: Prisma.Decimal;
    totalCost: Prisma.Decimal;
  }> {
    const totalCost = this.totalCost(input.costs);

    return {
      formulaDescription: this.netProfitFormulaDescription,
      value: {
        netProfit: this.decimal(input.grossIncome)
          .minus(totalCost)
          .toDecimalPlaces(2),
        totalCost
      },
      warnings: this.costWarnings(input.costs)
    };
  }

  calculateKmNetProfit(input: {
    netProfit: DecimalLike;
    totalKm: DecimalLike;
  }): FinanceCalculationResult<Prisma.Decimal> {
    return {
      formulaDescription: 'Km başı net kâr = net kâr / toplam km',
      value: this.divideOrZero(
        this.decimal(input.netProfit),
        this.decimal(input.totalKm)
      ).toDecimalPlaces(2),
      warnings: []
    };
  }

  calculateHourlyNetProfit(input: {
    activeMinutes: number | null | undefined;
    netProfit: DecimalLike;
  }): FinanceCalculationResult<Prisma.Decimal> {
    const activeHours =
      input.activeMinutes && input.activeMinutes > 0
        ? new Prisma.Decimal(input.activeMinutes).div(60)
        : new Prisma.Decimal(0);

    return {
      formulaDescription: 'Saatlik net kâr = net kâr / aktif saat',
      value: this.divideOrZero(this.decimal(input.netProfit), activeHours)
        .toDecimalPlaces(2),
      warnings: []
    };
  }

  calculateFuelCost(input: {
    averageLiterPer100Km?: DecimalLike | null;
    lastFuelPricePerLiter?: DecimalLike | null;
    totalKm: DecimalLike;
  }): FinanceCalculationResult<{
    fuelCostPerKm: Prisma.Decimal;
    tripFuelCost: Prisma.Decimal;
  }> {
    const warnings: CalculationWarning[] = [];
    const averageLiterPer100Km = this.decimal(input.averageLiterPer100Km);
    const lastFuelPricePerLiter = this.decimal(input.lastFuelPricePerLiter);
    const totalKm = this.decimal(input.totalKm);

    if (totalKm.gt(0) && averageLiterPer100Km.lte(0)) {
      warnings.push({
        code: 'VEHICLE_CONSUMPTION_MISSING',
        message: 'Araç ortalama tüketimi eksik olduğu için yakıt maliyeti hesaplanamadı.'
      });
    }

    if (totalKm.gt(0) && lastFuelPricePerLiter.lte(0)) {
      warnings.push({
        code: 'FUEL_PRICE_MISSING',
        message: 'Son yakıt litre fiyatı olmadığı için yakıt maliyeti hesaplanamadı.'
      });
    }

    const fuelCostPerKm =
      averageLiterPer100Km.gt(0) && lastFuelPricePerLiter.gt(0)
        ? lastFuelPricePerLiter.mul(averageLiterPer100Km).div(100)
        : new Prisma.Decimal(0);

    return {
      formulaDescription:
        'Yakıt maliyeti = son litre fiyatı x ortalama tüketim / 100 x toplam km',
      value: {
        fuelCostPerKm: fuelCostPerKm.toDecimalPlaces(4),
        tripFuelCost: fuelCostPerKm.mul(totalKm).toDecimalPlaces(2)
      },
      warnings
    };
  }

  calculateMaintenanceReserve(input: {
    maintenanceAmount?: DecimalLike | null;
    maintenanceIntervalKm?: DecimalLike | null;
    totalKm: DecimalLike;
  }): FinanceCalculationResult<Prisma.Decimal> {
    const amount = this.decimal(input.maintenanceAmount);
    const intervalKm = this.decimal(input.maintenanceIntervalKm);
    const totalKm = this.decimal(input.totalKm);
    const warnings: CalculationWarning[] = [];

    if (totalKm.gt(0) && (amount.lte(0) || intervalKm.lte(0))) {
      warnings.push({
        code: 'MAINTENANCE_NOT_DEFINED',
        message: 'Bakım tutarı veya bakım aralığı eksik olduğu için bakım rezervi hesaplanamadı.'
      });
    }

    return {
      formulaDescription:
        'Bakım rezervi = bakım tutarı / bakım aralığı km x toplam km',
      value:
        amount.gt(0) && intervalKm.gt(0)
          ? amount.div(intervalKm).mul(totalKm).toDecimalPlaces(2)
          : new Prisma.Decimal(0),
      warnings
    };
  }

  calculateDepreciation(input: {
    date: Date;
    depreciationEnabled?: boolean | null;
    model?: DepreciationModel | null;
    showInProfit?: boolean | null;
    totalKm: DecimalLike;
    yearlyEstimatedKm?: DecimalLike | null;
    yearlyValueLoss?: DecimalLike | null;
  }): FinanceCalculationResult<Prisma.Decimal> {
    const warnings: CalculationWarning[] = [];

    if (!input.depreciationEnabled || input.showInProfit === false) {
      return {
        formulaDescription:
          'Amortisman kapalı olduğu için net kâr hesabına dahil edilmedi.',
        value: new Prisma.Decimal(0),
        warnings: [
          {
            code: 'DEPRECIATION_DISABLED',
            message: 'Amortisman net kâr hesabında kapalı.'
          }
        ]
      };
    }

    const yearlyValueLoss = this.decimal(input.yearlyValueLoss);

    if (yearlyValueLoss.lte(0)) {
      warnings.push({
        code: 'DEPRECIATION_DISABLED',
        message: 'Yıllık değer kaybı tanımlı olmadığı için amortisman hesaplanamadı.'
      });

      return {
        formulaDescription: 'Amortisman = yıllık değer kaybı ayarına göre hesaplanır.',
        value: new Prisma.Decimal(0),
        warnings
      };
    }

    if (input.model === DepreciationModel.PER_KM) {
      const yearlyEstimatedKm = this.decimal(input.yearlyEstimatedKm);

      if (yearlyEstimatedKm.lte(0)) {
        warnings.push({
          code: 'DEPRECIATION_DISABLED',
          message: 'Yıllık tahmini km eksik olduğu için km bazlı amortisman hesaplanamadı.'
        });

        return {
          formulaDescription:
            'Km bazlı amortisman = yıllık değer kaybı / yıllık tahmini km x toplam km',
          value: new Prisma.Decimal(0),
          warnings
        };
      }

      return {
        formulaDescription:
          'Km bazlı amortisman = yıllık değer kaybı / yıllık tahmini km x toplam km',
        value: yearlyValueLoss
          .div(yearlyEstimatedKm)
          .mul(this.decimal(input.totalKm))
          .toDecimalPlaces(2),
        warnings
      };
    }

    if (input.model === DepreciationModel.MONTHLY) {
      return {
        formulaDescription:
          'Aylık amortisman = yıllık değer kaybı / 12 / ayın gün sayısı',
        value: yearlyValueLoss
          .div(12)
          .div(this.daysInMonth(input.date))
          .toDecimalPlaces(2),
        warnings
      };
    }

    return {
      formulaDescription: 'Amortisman modeli tanımlı değil.',
      value: new Prisma.Decimal(0),
      warnings: [
        {
          code: 'DEPRECIATION_DISABLED',
          message: 'Amortisman modeli tanımlı değil.'
        }
      ]
    };
  }

  calculateBreakEven(input: CostInput & { grossIncome: DecimalLike }) {
    const breakEvenTarget = this.decimal(input.packageShare)
      .plus(this.decimal(input.fuelCost))
      .plus(this.decimal(input.fixedCostShare))
      .plus(this.decimal(input.maintenanceReserve))
      .plus(this.decimal(input.depreciationCost))
      .toDecimalPlaces(2);
    const grossIncome = this.decimal(input.grossIncome);
    const progress = breakEvenTarget.gt(0)
      ? Prisma.Decimal.min(grossIncome.mul(100).div(breakEvenTarget), 100)
      : new Prisma.Decimal(0);

    return {
      formulaDescription:
        'Başabaş = paket payı + tahmini yakıt + sabit gider payı + bakım rezervi + amortisman',
      value: {
        breakEvenTarget,
        progress: progress.toDecimalPlaces(2),
        remaining: Prisma.Decimal.max(
          breakEvenTarget.minus(grossIncome),
          0
        ).toDecimalPlaces(2),
        status: breakEvenTarget.lte(0)
          ? 'NO_TARGET'
          : grossIncome.gte(breakEvenTarget)
            ? 'REACHED'
            : 'IN_PROGRESS'
      },
      warnings: this.costWarnings(input)
    };
  }

  totalCost(input: CostInput) {
    return this.decimal(input.fuelCost)
      .plus(this.decimal(input.packageShare))
      .plus(this.decimal(input.variableCostShare))
      .plus(this.decimal(input.fixedCostShare))
      .plus(this.decimal(input.maintenanceReserve))
      .plus(this.decimal(input.depreciationCost))
      .toDecimalPlaces(2);
  }

  decimal(value?: DecimalLike | null) {
    if (value === null || value === undefined || value === '') {
      return new Prisma.Decimal(0);
    }

    try {
      const decimalValue =
        value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);

      return decimalValue.isFinite() ? decimalValue : new Prisma.Decimal(0);
    } catch {
      return new Prisma.Decimal(0);
    }
  }

  divideOrZero(numerator: Prisma.Decimal, denominator: Prisma.Decimal) {
    if (denominator.lte(0)) {
      return new Prisma.Decimal(0);
    }

    return numerator.div(denominator);
  }

  private costWarnings(input: CostInput) {
    const warnings: CalculationWarning[] = [];

    if (this.decimal(input.packageShare).lte(0)) {
      warnings.push({
        code: 'PACKAGE_NOT_DEFINED',
        message: 'Paket payı tanımlı değil veya 0.'
      });
    }

    if (this.decimal(input.fixedCostShare).lte(0)) {
      warnings.push({
        code: 'FIXED_COST_NOT_DEFINED',
        message: 'Sabit gider payı tanımlı değil veya 0.'
      });
    }

    if (this.decimal(input.maintenanceReserve).lte(0)) {
      warnings.push({
        code: 'MAINTENANCE_NOT_DEFINED',
        message: 'Bakım rezervi tanımlı değil veya 0.'
      });
    }

    if (this.decimal(input.depreciationCost).lte(0)) {
      warnings.push({
        code: 'DEPRECIATION_DISABLED',
        message: 'Amortisman kapalı veya 0.'
      });
    }

    return warnings;
  }

  private daysInMonth(date: Date) {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
    ).getUTCDate();
  }
}

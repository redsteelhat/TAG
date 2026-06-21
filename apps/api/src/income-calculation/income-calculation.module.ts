import { Module } from '@nestjs/common';
import { FinanceCalculationModule } from '../finance-calculation/finance-calculation.module';
import { FuelCostModule } from '../fuel-cost/fuel-cost.module';
import { PackageAllocationModule } from '../package-allocation/package-allocation.module';
import { IncomeCalculationService } from './income-calculation.service';

@Module({
  imports: [FinanceCalculationModule, FuelCostModule, PackageAllocationModule],
  providers: [IncomeCalculationService],
  exports: [IncomeCalculationService]
})
export class IncomeCalculationModule {}

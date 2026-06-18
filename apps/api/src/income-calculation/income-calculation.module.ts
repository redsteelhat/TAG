import { Module } from '@nestjs/common';
import { FuelCostModule } from '../fuel-cost/fuel-cost.module';
import { PackageAllocationModule } from '../package-allocation/package-allocation.module';
import { IncomeCalculationService } from './income-calculation.service';

@Module({
  imports: [FuelCostModule, PackageAllocationModule],
  providers: [IncomeCalculationService],
  exports: [IncomeCalculationService]
})
export class IncomeCalculationModule {}

import { Module } from '@nestjs/common';
import { FuelCostModule } from '../fuel-cost/fuel-cost.module';
import { IncomeCalculationService } from './income-calculation.service';

@Module({
  imports: [FuelCostModule],
  providers: [IncomeCalculationService],
  exports: [IncomeCalculationService]
})
export class IncomeCalculationModule {}

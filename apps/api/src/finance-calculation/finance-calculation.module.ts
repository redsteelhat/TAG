import { Module } from '@nestjs/common';
import { FinanceCalculationEngine } from './finance-calculation.engine';

@Module({
  providers: [FinanceCalculationEngine],
  exports: [FinanceCalculationEngine]
})
export class FinanceCalculationModule {}

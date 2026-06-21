import { Module } from '@nestjs/common';
import { FinanceCalculationModule } from '../finance-calculation/finance-calculation.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FuelCostService } from './fuel-cost.service';

@Module({
  imports: [FinanceCalculationModule, PrismaModule],
  providers: [FuelCostService],
  exports: [FuelCostService]
})
export class FuelCostModule {}

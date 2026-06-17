import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IncomeCalculationService } from './income-calculation.service';

@Module({
  imports: [PrismaModule],
  providers: [IncomeCalculationService],
  exports: [IncomeCalculationService]
})
export class IncomeCalculationModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FuelCostService } from './fuel-cost.service';

@Module({
  imports: [PrismaModule],
  providers: [FuelCostService],
  exports: [FuelCostService]
})
export class FuelCostModule {}

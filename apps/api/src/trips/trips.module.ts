import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShiftsModule } from '../shifts/shifts.module';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  imports: [PrismaModule, ShiftsModule],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService]
})
export class TripsModule {}

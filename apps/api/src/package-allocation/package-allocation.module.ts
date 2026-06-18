import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PackageAllocationService } from './package-allocation.service';

@Module({
  imports: [PrismaModule],
  providers: [PackageAllocationService],
  exports: [PackageAllocationService]
})
export class PackageAllocationModule {}

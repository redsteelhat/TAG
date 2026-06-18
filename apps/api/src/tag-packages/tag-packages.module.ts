import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TagPackagesController } from './tag-packages.controller';
import { TagPackagesService } from './tag-packages.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [TagPackagesController],
  providers: [TagPackagesService],
  exports: [TagPackagesService]
})
export class TagPackagesModule {}

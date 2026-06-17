import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deleted_at: null
      }
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.full_name,
      role: user.role,
      subscriptionStatus: user.subscription_status,
      trialEndsAt: user.trial_ends_at,
      locale: user.locale,
      timezone: user.timezone,
      createdAt: user.created_at
    };
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const user = await this.prisma.user.update({
      where: {
        id: userId
      },
      data: {
        full_name: dto.fullName,
        timezone: dto.timezone
      }
    });

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.full_name,
      role: user.role,
      subscriptionStatus: user.subscription_status,
      trialEndsAt: user.trial_ends_at,
      locale: user.locale,
      timezone: user.timezone,
      createdAt: user.created_at
    };
  }

  async getDriverProfile(userId: string) {
    const profile = await this.prisma.driverProfile.upsert({
      where: {
        user_id: userId
      },
      create: {
        user_id: userId
      },
      update: {}
    });

    return this.toDriverProfileResponse(profile);
  }

  async updateDriverProfile(userId: string, dto: UpdateDriverProfileDto) {
    const profile = await this.prisma.driverProfile.upsert({
      where: {
        user_id: userId
      },
      create: {
        user_id: userId,
        default_vehicle_id: dto.defaultVehicleId,
        fixed_cost_allocation_method: dto.fixedCostAllocationMethod,
        show_depreciation_in_profit: dto.showDepreciationInProfit,
        daily_target_net_profit: dto.dailyTargetNetProfit
      },
      update: {
        default_vehicle_id: dto.defaultVehicleId,
        fixed_cost_allocation_method: dto.fixedCostAllocationMethod,
        show_depreciation_in_profit: dto.showDepreciationInProfit,
        daily_target_net_profit: dto.dailyTargetNetProfit
      }
    });

    return this.toDriverProfileResponse(profile);
  }

  private toDriverProfileResponse(profile: {
    id: string;
    user_id: string;
    default_vehicle_id: string | null;
    fixed_cost_allocation_method: string;
    show_depreciation_in_profit: boolean;
    daily_target_net_profit: Prisma.Decimal | null;
    created_at: Date;
    updated_at: Date;
  }) {
    return {
      id: profile.id,
      userId: profile.user_id,
      defaultVehicleId: profile.default_vehicle_id,
      fixedCostAllocationMethod: profile.fixed_cost_allocation_method,
      showDepreciationInProfit: profile.show_depreciation_in_profit,
      dailyTargetNetProfit: profile.daily_target_net_profit?.toFixed(2) ?? null,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    };
  }
}


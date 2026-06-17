import {
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma, Vehicle } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateVehicleDto) {
    const existingVehicleCount = await this.prisma.vehicle.count({
      where: {
        user_id: userId,
        deleted_at: null
      }
    });
    const shouldBeActive = existingVehicleCount === 0;

    try {
      const vehicle = await this.prisma.$transaction(async (tx) => {
        if (shouldBeActive) {
          await tx.vehicle.updateMany({
            where: {
              user_id: userId,
              deleted_at: null
            },
            data: {
              is_active: false
            }
          });
        }

        return tx.vehicle.create({
          data: {
            ...this.toVehicleCreateData(dto),
            user_id: userId,
            is_active: shouldBeActive
          }
        });
      });

      return this.toVehicleResponse(vehicle);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Vehicle plate already exists.');
      }

      throw error;
    }
  }

  async findAll(userId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        user_id: userId,
        deleted_at: null
      },
      orderBy: [{ is_active: 'desc' }, { created_at: 'desc' }]
    });

    return vehicles.map((vehicle) => this.toVehicleResponse(vehicle));
  }

  async findOne(userId: string, id: string) {
    const vehicle = await this.findOwnedVehicle(userId, id);

    return this.toVehicleResponse(vehicle);
  }

  async update(userId: string, id: string, dto: UpdateVehicleDto) {
    await this.findOwnedVehicle(userId, id);

    try {
      const vehicle = await this.prisma.vehicle.update({
        where: {
          id
        },
        data: this.toVehicleUpdateData(dto)
      });

      return this.toVehicleResponse(vehicle);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Vehicle plate already exists.');
      }

      throw error;
    }
  }

  async remove(userId: string, id: string) {
    const vehicle = await this.findOwnedVehicle(userId, id);

    await this.prisma.vehicle.update({
      where: {
        id
      },
      data: {
        deleted_at: new Date(),
        is_active: false
      }
    });

    if (vehicle.is_active) {
      const nextVehicle = await this.prisma.vehicle.findFirst({
        where: {
          user_id: userId,
          deleted_at: null,
          id: {
            not: id
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      if (nextVehicle) {
        await this.setActive(userId, nextVehicle.id);
      }
    }

    return {
      success: true
    };
  }

  async setActive(userId: string, id: string) {
    await this.findOwnedVehicle(userId, id);

    const vehicle = await this.prisma.$transaction(async (tx) => {
      await tx.vehicle.updateMany({
        where: {
          user_id: userId,
          deleted_at: null
        },
        data: {
          is_active: false
        }
      });

      const activeVehicle = await tx.vehicle.update({
        where: {
          id
        },
        data: {
          is_active: true
        }
      });

      await tx.driverProfile.upsert({
        where: {
          user_id: userId
        },
        create: {
          user_id: userId,
          default_vehicle_id: id
        },
        update: {
          default_vehicle_id: id
        }
      });

      return activeVehicle;
    });

    return this.toVehicleResponse(vehicle);
  }

  private async findOwnedVehicle(userId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id,
        user_id: userId,
        deleted_at: null
      }
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    return vehicle;
  }

  private normalizePlate(plateNumber?: string) {
    return plateNumber?.replace(/\s+/g, '').toUpperCase();
  }

  private toVehicleCreateData(dto: CreateVehicleDto) {
    const plateNumber = this.normalizePlate(dto.plateNumber);

    if (!plateNumber) {
      throw new ConflictException('Vehicle plate is required.');
    }

    return {
      plate_number: plateNumber,
      brand: dto.brand,
      model: dto.model,
      model_year: dto.modelYear,
      fuel_type: dto.fuelType,
      average_consumption_l_per_100km: dto.averageConsumptionLPer100Km,
      odometer_km: dto.odometerKm,
      depreciation_enabled: dto.depreciationEnabled,
      depreciation_model: dto.depreciationModel,
      annual_depreciation_amount: dto.annualDepreciationAmount,
      annual_estimated_km: dto.annualEstimatedKm
    };
  }

  private toVehicleUpdateData(dto: UpdateVehicleDto) {
    const data: Prisma.VehicleUpdateInput = {};

    if (dto.plateNumber !== undefined) {
      data.plate_number = this.normalizePlate(dto.plateNumber);
    }

    if (dto.brand !== undefined) {
      data.brand = dto.brand;
    }

    if (dto.model !== undefined) {
      data.model = dto.model;
    }

    if (dto.modelYear !== undefined) {
      data.model_year = dto.modelYear;
    }

    if (dto.fuelType !== undefined) {
      data.fuel_type = dto.fuelType;
    }

    if (dto.averageConsumptionLPer100Km !== undefined) {
      data.average_consumption_l_per_100km = dto.averageConsumptionLPer100Km;
    }

    if (dto.odometerKm !== undefined) {
      data.odometer_km = dto.odometerKm;
    }

    if (dto.depreciationEnabled !== undefined) {
      data.depreciation_enabled = dto.depreciationEnabled;
    }

    if (dto.depreciationModel !== undefined) {
      data.depreciation_model = dto.depreciationModel;
    }

    if (dto.annualDepreciationAmount !== undefined) {
      data.annual_depreciation_amount = dto.annualDepreciationAmount;
    }

    if (dto.annualEstimatedKm !== undefined) {
      data.annual_estimated_km = dto.annualEstimatedKm;
    }

    return data;
  }

  private toVehicleResponse(vehicle: Vehicle) {
    return {
      id: vehicle.id,
      plateNumber: vehicle.plate_number,
      brand: vehicle.brand,
      model: vehicle.model,
      modelYear: vehicle.model_year,
      fuelType: vehicle.fuel_type,
      averageConsumptionLPer100Km:
        vehicle.average_consumption_l_per_100km.toFixed(3),
      odometerKm: vehicle.odometer_km?.toFixed(1) ?? null,
      isActive: vehicle.is_active,
      depreciationEnabled: vehicle.depreciation_enabled,
      depreciationModel: vehicle.depreciation_model,
      annualDepreciationAmount:
        vehicle.annual_depreciation_amount?.toFixed(2) ?? null,
      annualEstimatedKm: vehicle.annual_estimated_km?.toFixed(1) ?? null,
      createdAt: vehicle.created_at,
      updatedAt: vehicle.updated_at
    };
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}

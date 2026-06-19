import { BadRequestException } from '@nestjs/common';
import { DepreciationModel, FuelType, Prisma, Vehicle } from '@prisma/client';
import { VehiclesService } from './vehicles.service';

const vehicle = {
  annual_depreciation_amount: null,
  annual_estimated_km: null,
  average_consumption_l_per_100km: new Prisma.Decimal('7.500'),
  brand: 'Toyota',
  created_at: new Date('2026-06-17T00:00:00.000Z'),
  deleted_at: null,
  depreciation_enabled: false,
  depreciation_model: null,
  fuel_type: FuelType.GASOLINE,
  id: 'vehicle_1',
  is_active: true,
  model: 'Corolla',
  model_year: 2020,
  odometer_km: new Prisma.Decimal('85000.0'),
  plate_number: '34ABC123',
  updated_at: new Date('2026-06-17T00:00:00.000Z'),
  user_id: 'user_1'
} as Vehicle;

describe('VehiclesService', () => {
  it('normalizes plate numbers', () => {
    const service = new VehiclesService({} as never);
    const normalized = (
      service as unknown as {
        normalizePlate(plateNumber: string): string;
      }
    ).normalizePlate('34 abc 123');

    expect(normalized).toBe('34ABC123');
  });

  it('updates depreciation settings for a vehicle', async () => {
    const prisma = {
      vehicle: {
        findFirst: jest.fn().mockResolvedValue(vehicle),
        update: jest.fn().mockResolvedValue({
          ...vehicle,
          annual_depreciation_amount: new Prisma.Decimal('60000.00'),
          annual_estimated_km: new Prisma.Decimal('30000.0'),
          depreciation_enabled: true,
          depreciation_model: DepreciationModel.PER_KM
        })
      }
    };
    const service = new VehiclesService(prisma as never);

    const result = await service.updateDepreciationSettings(
      'user_1',
      'vehicle_1',
      {
        annualDepreciationAmount: '60000.00',
        annualEstimatedKm: '30000.00',
        depreciationEnabled: true,
        depreciationModel: DepreciationModel.PER_KM
      }
    );

    expect(prisma.vehicle.update).toHaveBeenCalledWith({
      where: {
        id: 'vehicle_1'
      },
      data: {
        annual_depreciation_amount: '60000.00',
        annual_estimated_km: '30000.00',
        depreciation_enabled: true,
        depreciation_model: DepreciationModel.PER_KM
      }
    });
    expect(result.depreciationEnabled).toBe(true);
    expect(result.depreciationModel).toBe(DepreciationModel.PER_KM);
    expect(result.annualDepreciationAmount).toBe('60000.00');
    expect(result.annualEstimatedKm).toBe('30000.0');
  });

  it('rejects per-kilometer depreciation without annual estimated km', async () => {
    const prisma = {
      vehicle: {
        findFirst: jest.fn().mockResolvedValue(vehicle)
      }
    };
    const service = new VehiclesService(prisma as never);

    await expect(
      service.updateDepreciationSettings('user_1', 'vehicle_1', {
        annualDepreciationAmount: '60000.00',
        depreciationEnabled: true,
        depreciationModel: DepreciationModel.PER_KM
      })
    ).rejects.toThrow(BadRequestException);
  });
});

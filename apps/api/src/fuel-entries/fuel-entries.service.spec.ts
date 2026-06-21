import { BadRequestException } from '@nestjs/common';
import { FuelType, Prisma } from '@prisma/client';
import { FuelEntriesService } from './fuel-entries.service';

describe('FuelEntriesService', () => {
  it('creates a fuel entry with calculated price and invalidates report cache', async () => {
    const createdAt = new Date('2026-06-18T09:00:00.000Z');
    const fuelEntry = {
      amount: new Prisma.Decimal('1500'),
      city: 'Istanbul',
      created_at: createdAt,
      deleted_at: null,
      district: 'Kadikoy',
      fuel_type: FuelType.DIESEL,
      full_tank: true,
      id: 'fuel_1',
      liters: new Prisma.Decimal('32.5'),
      odometer_km: new Prisma.Decimal('85120.5'),
      payment_method: 'CARD',
      price_per_liter: new Prisma.Decimal('46.154'),
      receipt_url: null,
      station_name: 'Shell',
      tank_fill_level: 'FULL',
      updated_at: createdAt,
      user_id: 'user_1',
      vehicle_id: 'vehicle_1'
    };
    const prisma = {
      fuelEntry: {
        create: jest.fn().mockResolvedValue(fuelEntry)
      },
      vehicle: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'vehicle_1',
          user_id: 'user_1'
        })
      }
    };
    const reportCache = {
      deleteByUser: jest.fn()
    };
    const service = new FuelEntriesService(
      prisma as never,
      reportCache as never
    );

    const response = await service.create('user_1', {
      amount: '1500.00',
      createdAt: '2026-06-18T12:00:00.000Z',
      fuelType: FuelType.DIESEL,
      fullTank: true,
      liters: '32.500',
      odometerKm: '85120.5',
      tankFillLevel: 'FULL',
      vehicleId: 'vehicle_1'
    });

    expect(prisma.fuelEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          created_at: new Date('2026-06-18T12:00:00.000Z'),
          fuel_type: FuelType.DIESEL,
          price_per_liter: '46.154'
        })
      })
    );
    expect(reportCache.deleteByUser).toHaveBeenCalledWith('user_1');
    expect(response.pricePerLiter).toBe('46.154');
  });

  it('maps fuel entry responses with fixed decimal strings', () => {
    const service = new FuelEntriesService({} as never);
    const response = (
      service as unknown as {
        toFuelEntryResponse(fuelEntry: Record<string, unknown>): {
          amount: string;
          liters: string;
          pricePerLiter: string;
        };
      }
    ).toFuelEntryResponse({
      amount: new Prisma.Decimal('1500'),
      city: 'Istanbul',
      created_at: new Date('2026-06-18T07:00:00.000Z'),
      deleted_at: null,
      district: 'Kadikoy',
      fuel_type: FuelType.GASOLINE,
      full_tank: true,
      id: 'fuel_1',
      liters: new Prisma.Decimal('32.5'),
      odometer_km: new Prisma.Decimal('85120.5'),
      payment_method: 'CARD',
      price_per_liter: new Prisma.Decimal('46.153846'),
      receipt_url: null,
      station_name: 'Shell',
      tank_fill_level: 'FULL',
      updated_at: new Date('2026-06-18T07:00:00.000Z'),
      user_id: 'user_1',
      vehicle_id: 'vehicle_1'
    });

    expect(response.amount).toBe('1500.00');
    expect(response.liters).toBe('32.500');
    expect(response.pricePerLiter).toBe('46.154');
  });

  it('calculates price per liter from amount and liters', () => {
    const service = new FuelEntriesService({} as never);
    const pricePerLiter = (
      service as unknown as {
        resolvePricePerLiter(amount: string, liters: string): string;
      }
    ).resolvePricePerLiter('1500.00', '32.500');

    expect(pricePerLiter).toBe('46.154');
  });

  it('rejects zero liters', () => {
    const service = new FuelEntriesService({} as never);

    expect(() =>
      (
        service as unknown as {
          resolvePricePerLiter(amount: string, liters: string): string;
        }
      ).resolvePricePerLiter('1500.00', '0')
    ).toThrow(BadRequestException);
  });
});

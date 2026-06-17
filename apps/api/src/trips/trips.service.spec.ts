import { Prisma } from '@prisma/client';
import { TripsService } from './trips.service';

describe('TripsService', () => {
  it('maps trip responses with fixed decimal strings', () => {
    const service = new TripsService({} as never, {} as never);
    const response = (
      service as unknown as {
        toTripResponse(trip: Record<string, unknown>): {
          grossIncome: string;
          totalKm: string;
          trueNetProfit: string;
        };
      }
    ).toTripResponse({
      allocated_depreciation_cost: new Prisma.Decimal('0'),
      allocated_fixed_cost: new Prisma.Decimal('0'),
      allocated_maintenance_cost: new Prisma.Decimal('0'),
      allocated_other_variable_cost: new Prisma.Decimal('0'),
      allocated_package_cost: new Prisma.Decimal('0'),
      cancellation_income: new Prisma.Decimal('0'),
      cash_net_profit: new Prisma.Decimal('410'),
      created_at: new Date('2026-06-17T07:00:00.000Z'),
      deadhead_km: new Prisma.Decimal('4'),
      dropoff_location: 'Besiktas',
      duration_minutes: 32,
      ended_at: new Date('2026-06-17T07:47:00.000Z'),
      estimated_fuel_cost: new Prisma.Decimal('40'),
      gross_income: new Prisma.Decimal('450'),
      id: 'trip_1',
      note: null,
      payment_method: 'DIGITAL',
      pickup_location: 'Kadikoy',
      profit_calculation_version: 'trip-crud-v1',
      shift_id: null,
      started_at: new Date('2026-06-17T07:15:00.000Z'),
      tip_amount: new Prisma.Decimal('0'),
      total_income: new Prisma.Decimal('450'),
      total_km: new Prisma.Decimal('22'),
      trip_date: new Date('2026-06-17T00:00:00.000Z'),
      trip_km: new Prisma.Decimal('18'),
      true_net_profit: new Prisma.Decimal('410'),
      updated_at: new Date('2026-06-17T07:00:00.000Z'),
      user_id: 'user_1',
      vehicle_id: 'vehicle_1'
    });

    expect(response.grossIncome).toBe('450.00');
    expect(response.totalKm).toBe('22.00');
    expect(response.trueNetProfit).toBe('410.00');
  });
});

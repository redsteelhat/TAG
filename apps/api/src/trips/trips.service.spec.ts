import { PaymentMethodType, Prisma } from '@prisma/client';
import { TripsService } from './trips.service';

describe('TripsService', () => {
  it('creates a trip with finance calculation values and mapped locations', async () => {
    const createdTrip = {
      allocated_depreciation_cost: new Prisma.Decimal('5'),
      allocated_fixed_cost: new Prisma.Decimal('10'),
      allocated_maintenance_cost: new Prisma.Decimal('7'),
      allocated_other_variable_cost: new Prisma.Decimal('3'),
      allocated_package_cost: new Prisma.Decimal('25'),
      cancellation_income: new Prisma.Decimal('0'),
      cash_net_profit: new Prisma.Decimal('390'),
      created_at: new Date('2026-06-17T07:00:00.000Z'),
      deadhead_km: new Prisma.Decimal('4'),
      dropoff_location: 'Beşiktaş',
      duration_minutes: 32,
      ended_at: new Date('2026-06-17T07:47:00.000Z'),
      estimated_fuel_cost: new Prisma.Decimal('60'),
      gross_income: new Prisma.Decimal('450'),
      id: 'trip_1',
      note: 'Test',
      payment_method: PaymentMethodType.DIGITAL,
      pickup_location: 'Kadıköy',
      profit_calculation_version: 'income-calculation-v1',
      shift_id: null,
      started_at: new Date('2026-06-17T07:15:00.000Z'),
      tip_amount: new Prisma.Decimal('0'),
      total_income: new Prisma.Decimal('450'),
      total_km: new Prisma.Decimal('22'),
      trip_date: new Date('2026-06-17T00:00:00.000Z'),
      trip_km: new Prisma.Decimal('18'),
      true_net_profit: new Prisma.Decimal('340'),
      updated_at: new Date('2026-06-17T07:00:00.000Z'),
      user_id: 'user_1',
      vehicle_id: 'vehicle_1'
    };
    const prisma = {
      trip: {
        create: jest.fn().mockResolvedValue(createdTrip)
      },
      vehicle: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'vehicle_1',
          user_id: 'user_1'
        })
      }
    };
    const incomeCalculationService = {
      calculationVersion: 'income-calculation-v1',
      calculateTripIncome: jest.fn().mockResolvedValue({
        allocatedDepreciationCost: new Prisma.Decimal('5'),
        allocatedFixedCost: new Prisma.Decimal('10'),
        allocatedMaintenanceCost: new Prisma.Decimal('7'),
        allocatedOtherVariableCost: new Prisma.Decimal('3'),
        allocatedPackageCost: new Prisma.Decimal('25'),
        cashNetProfit: new Prisma.Decimal('390'),
        durationMinutes: 32,
        estimatedFuelCost: new Prisma.Decimal('60'),
        totalIncome: new Prisma.Decimal('450'),
        totalKm: new Prisma.Decimal('22'),
        trueNetProfit: new Prisma.Decimal('340')
      })
    };
    const service = new TripsService(
      prisma as never,
      incomeCalculationService as never
    );

    const response = await service.create('user_1', {
      deadheadKm: '4.00',
      dropoffLocation: 'Beşiktaş',
      grossIncome: '450.00',
      paymentMethod: PaymentMethodType.DIGITAL,
      pickupLocation: 'Kadıköy',
      startedAt: '2026-06-17T07:15:00.000Z',
      endedAt: '2026-06-17T07:47:00.000Z',
      tripDate: '2026-06-17',
      tripKm: '18.00',
      vehicleId: 'vehicle_1',
      note: 'Test'
    });

    expect(incomeCalculationService.calculateTripIncome).toHaveBeenCalledWith(
      'user_1',
      expect.objectContaining({ id: 'vehicle_1' }),
      expect.objectContaining({
        deadheadKm: '4.00',
        pickupLocation: 'Kadıköy',
        tripKm: '18.00'
      })
    );
    expect(prisma.trip.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estimated_fuel_cost: new Prisma.Decimal('60'),
          pickup_location: 'Kadıköy',
          dropoff_location: 'Beşiktaş',
          total_km: new Prisma.Decimal('22'),
          true_net_profit: new Prisma.Decimal('340')
        })
      })
    );
    expect(response.pickupLocation).toBe('Kadıköy');
    expect(response.dropoffLocation).toBe('Beşiktaş');
    expect(response.estimatedFuelCost).toBe('60.00');
    expect(response.trueNetProfit).toBe('340.00');
  });

  it('updates a trip with recalculated finance values and locations', async () => {
    const currentTrip = {
      allocated_depreciation_cost: new Prisma.Decimal('0'),
      allocated_fixed_cost: new Prisma.Decimal('0'),
      allocated_maintenance_cost: new Prisma.Decimal('0'),
      allocated_other_variable_cost: new Prisma.Decimal('0'),
      allocated_package_cost: new Prisma.Decimal('10'),
      cancellation_income: new Prisma.Decimal('0'),
      cash_net_profit: new Prisma.Decimal('220'),
      created_at: new Date('2026-06-17T07:00:00.000Z'),
      deadhead_km: new Prisma.Decimal('2'),
      dropoff_location: 'Üsküdar',
      duration_minutes: 20,
      ended_at: new Date('2026-06-17T07:35:00.000Z'),
      estimated_fuel_cost: new Prisma.Decimal('25'),
      gross_income: new Prisma.Decimal('250'),
      id: 'trip_1',
      note: null,
      payment_method: PaymentMethodType.DIGITAL,
      pickup_location: 'Kadıköy',
      profit_calculation_version: 'income-calculation-v1',
      shift_id: null,
      started_at: new Date('2026-06-17T07:15:00.000Z'),
      tip_amount: new Prisma.Decimal('5'),
      total_income: new Prisma.Decimal('255'),
      total_km: new Prisma.Decimal('10'),
      trip_date: new Date('2026-06-17T00:00:00.000Z'),
      trip_km: new Prisma.Decimal('8'),
      true_net_profit: new Prisma.Decimal('220'),
      updated_at: new Date('2026-06-17T07:00:00.000Z'),
      user_id: 'user_1',
      vehicle_id: 'vehicle_1'
    };
    const updatedTrip = {
      ...currentTrip,
      deadhead_km: new Prisma.Decimal('4'),
      dropoff_location: 'Beşiktaş',
      duration_minutes: 42,
      ended_at: new Date('2026-06-17T08:02:00.000Z'),
      estimated_fuel_cost: new Prisma.Decimal('55'),
      gross_income: new Prisma.Decimal('390'),
      note: 'Düzenlendi',
      payment_method: PaymentMethodType.CARD,
      pickup_location: 'Ataşehir',
      tip_amount: new Prisma.Decimal('10'),
      total_income: new Prisma.Decimal('400'),
      total_km: new Prisma.Decimal('19'),
      trip_km: new Prisma.Decimal('15'),
      true_net_profit: new Prisma.Decimal('300'),
      updated_at: new Date('2026-06-17T08:05:00.000Z')
    };
    const prisma = {
      trip: {
        findFirst: jest.fn().mockResolvedValue(currentTrip),
        update: jest.fn().mockResolvedValue(updatedTrip)
      },
      vehicle: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'vehicle_1',
          user_id: 'user_1'
        })
      }
    };
    const incomeCalculationService = {
      calculationVersion: 'income-calculation-v1',
      calculateTripIncome: jest.fn().mockResolvedValue({
        allocatedDepreciationCost: new Prisma.Decimal('0'),
        allocatedFixedCost: new Prisma.Decimal('0'),
        allocatedMaintenanceCost: new Prisma.Decimal('0'),
        allocatedOtherVariableCost: new Prisma.Decimal('0'),
        allocatedPackageCost: new Prisma.Decimal('45'),
        cashNetProfit: new Prisma.Decimal('345'),
        durationMinutes: 42,
        estimatedFuelCost: new Prisma.Decimal('55'),
        totalIncome: new Prisma.Decimal('400'),
        totalKm: new Prisma.Decimal('19'),
        trueNetProfit: new Prisma.Decimal('300')
      })
    };
    const service = new TripsService(
      prisma as never,
      incomeCalculationService as never
    );

    const response = await service.update('user_1', 'trip_1', {
      deadheadKm: '4.00',
      dropoffLocation: 'Beşiktaş',
      endedAt: '2026-06-17T08:02:00.000Z',
      grossIncome: '390.00',
      note: 'Düzenlendi',
      paymentMethod: PaymentMethodType.CARD,
      pickupLocation: 'Ataşehir',
      startedAt: '2026-06-17T07:20:00.000Z',
      tipAmount: '10.00',
      tripKm: '15.00'
    });

    expect(incomeCalculationService.calculateTripIncome).toHaveBeenCalledWith(
      'user_1',
      expect.objectContaining({ id: 'vehicle_1' }),
      expect.objectContaining({
        currentTripId: 'trip_1',
        deadheadKm: '4.00',
        grossIncome: '390.00',
        tripKm: '15.00'
      })
    );
    expect(prisma.trip.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dropoff_location: 'Beşiktaş',
          estimated_fuel_cost: new Prisma.Decimal('55'),
          payment_method: PaymentMethodType.CARD,
          pickup_location: 'Ataşehir',
          total_km: new Prisma.Decimal('19'),
          true_net_profit: new Prisma.Decimal('300')
        }),
        where: { id: 'trip_1' }
      })
    );
    expect(response.pickupLocation).toBe('Ataşehir');
    expect(response.dropoffLocation).toBe('Beşiktaş');
    expect(response.estimatedFuelCost).toBe('55.00');
    expect(response.trueNetProfit).toBe('300.00');
  });

  it('soft-deletes a trip and recalculates shift totals', async () => {
    const prisma = {
      trip: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'trip_1',
          shift_id: 'shift_1'
        }),
        update: jest.fn().mockResolvedValue({})
      }
    };
    const shiftsService = {
      recalculateShiftTotals: jest.fn()
    };
    const service = new TripsService(
      prisma as never,
      {} as never,
      shiftsService as never
    );

    await expect(service.remove('user_1', 'trip_1')).resolves.toEqual({
      success: true
    });
    expect(prisma.trip.update).toHaveBeenCalledWith({
      where: { id: 'trip_1' },
      data: { deleted_at: expect.any(Date) }
    });
    expect(shiftsService.recalculateShiftTotals).toHaveBeenCalledWith(
      'user_1',
      'shift_1'
    );
  });

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
      payment_method: PaymentMethodType.DIGITAL,
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

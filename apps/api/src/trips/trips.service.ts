import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional
} from '@nestjs/common';
import { PaymentMethodType, Prisma, Trip } from '@prisma/client';
import { IncomeCalculationService } from '../income-calculation/income-calculation.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShiftsService } from '../shifts/shifts.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { ListTripsQueryDto } from './dto/list-trips-query.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly incomeCalculationService: IncomeCalculationService,
    @Optional() private readonly shiftsService?: ShiftsService
  ) {}

  async create(userId: string, dto: CreateTripDto) {
    const vehicle = await this.findOwnedVehicle(userId, dto.vehicleId);

    if (dto.shiftId) {
      await this.findOwnedShift(userId, dto.shiftId, vehicle.id);
    }

    const startedAt = this.toOptionalDate(dto.startedAt);
    const endedAt = this.toOptionalDate(dto.endedAt);
    const calculation = await this.incomeCalculationService.calculateTripIncome(
      userId,
      vehicle,
      {
        ...dto,
        startedAt,
        endedAt
      }
    );

    const trip = await this.prisma.trip.create({
      data: {
        user_id: userId,
        vehicle_id: vehicle.id,
        shift_id: dto.shiftId,
        trip_date: this.toDate(dto.tripDate),
        started_at: startedAt,
        ended_at: endedAt,
        duration_minutes: calculation.durationMinutes,
        gross_income: dto.grossIncome,
        tip_amount: dto.tipAmount ?? '0',
        cancellation_income: dto.cancellationIncome ?? '0',
        total_income: calculation.totalIncome,
        payment_method: dto.paymentMethod,
        pickup_location: dto.pickupLocation,
        dropoff_location: dto.dropoffLocation,
        trip_km: dto.tripKm ?? '0',
        deadhead_km: dto.deadheadKm ?? '0',
        total_km: calculation.totalKm,
        estimated_fuel_cost: calculation.estimatedFuelCost,
        allocated_package_cost: calculation.allocatedPackageCost,
        allocated_fixed_cost: calculation.allocatedFixedCost,
        allocated_maintenance_cost: calculation.allocatedMaintenanceCost,
        allocated_depreciation_cost: calculation.allocatedDepreciationCost,
        allocated_other_variable_cost: calculation.allocatedOtherVariableCost,
        cash_net_profit: calculation.cashNetProfit,
        true_net_profit: calculation.trueNetProfit,
        profit_calculation_version:
          this.incomeCalculationService.calculationVersion,
        note: dto.note
      }
    });

    await this.recalculateShiftTotals(userId, trip.shift_id);

    return this.toTripResponse(trip);
  }

  async findAll(userId: string, query: ListTripsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.toTripWhereInput(userId, query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.trip.findMany({
        where,
        orderBy: [{ trip_date: 'desc' }, { created_at: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.trip.count({
        where
      })
    ]);

    return {
      data: items.map((trip) => this.toTripResponse(trip)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  async findOne(userId: string, id: string) {
    const trip = await this.findOwnedTrip(userId, id);

    return this.toTripResponse(trip);
  }

  async update(userId: string, id: string, dto: UpdateTripDto) {
    const currentTrip = await this.findOwnedTrip(userId, id);
    const previousShiftId = currentTrip.shift_id;
    const vehicleId = dto.vehicleId ?? currentTrip.vehicle_id;
    const vehicle = await this.findOwnedVehicle(userId, vehicleId);
    const shiftId = dto.shiftId ?? currentTrip.shift_id;

    if (shiftId) {
      await this.findOwnedShift(userId, shiftId, vehicle.id);
    }

    const startedAt =
      dto.startedAt !== undefined
        ? this.toOptionalDate(dto.startedAt)
        : currentTrip.started_at;
    const endedAt =
      dto.endedAt !== undefined
        ? this.toOptionalDate(dto.endedAt)
        : currentTrip.ended_at;
    const calculation = await this.incomeCalculationService.calculateTripIncome(
      userId,
      vehicle,
      {
        cancellationIncome:
          dto.cancellationIncome ?? currentTrip.cancellation_income,
        deadheadKm: dto.deadheadKm ?? currentTrip.deadhead_km,
        durationMinutes:
          dto.durationMinutes !== undefined
            ? dto.durationMinutes
            : currentTrip.duration_minutes,
        endedAt,
        grossIncome: dto.grossIncome ?? currentTrip.gross_income,
        startedAt,
        tipAmount: dto.tipAmount ?? currentTrip.tip_amount,
        tripKm: dto.tripKm ?? currentTrip.trip_km
      }
    );

    const trip = await this.prisma.trip.update({
      where: {
        id
      },
      data: {
        vehicle_id: vehicle.id,
        shift_id: shiftId,
        trip_date:
          dto.tripDate !== undefined
            ? this.toDate(dto.tripDate)
            : currentTrip.trip_date,
        started_at: startedAt,
        ended_at: endedAt,
        duration_minutes: calculation.durationMinutes,
        gross_income: dto.grossIncome ?? currentTrip.gross_income,
        tip_amount: dto.tipAmount ?? currentTrip.tip_amount,
        cancellation_income:
          dto.cancellationIncome ?? currentTrip.cancellation_income,
        total_income: calculation.totalIncome,
        payment_method: dto.paymentMethod ?? currentTrip.payment_method,
        pickup_location: dto.pickupLocation ?? currentTrip.pickup_location,
        dropoff_location: dto.dropoffLocation ?? currentTrip.dropoff_location,
        trip_km: dto.tripKm ?? currentTrip.trip_km,
        deadhead_km: dto.deadheadKm ?? currentTrip.deadhead_km,
        total_km: calculation.totalKm,
        estimated_fuel_cost: calculation.estimatedFuelCost,
        allocated_package_cost: calculation.allocatedPackageCost,
        allocated_fixed_cost: calculation.allocatedFixedCost,
        allocated_maintenance_cost: calculation.allocatedMaintenanceCost,
        allocated_depreciation_cost: calculation.allocatedDepreciationCost,
        allocated_other_variable_cost: calculation.allocatedOtherVariableCost,
        cash_net_profit: calculation.cashNetProfit,
        true_net_profit: calculation.trueNetProfit,
        profit_calculation_version:
          this.incomeCalculationService.calculationVersion,
        note: dto.note ?? currentTrip.note
      }
    });

    await this.recalculateShiftTotals(userId, previousShiftId);
    await this.recalculateShiftTotals(userId, trip.shift_id, previousShiftId);

    return this.toTripResponse(trip);
  }

  async remove(userId: string, id: string) {
    const trip = await this.findOwnedTrip(userId, id);

    await this.prisma.trip.update({
      where: {
        id
      },
      data: {
        deleted_at: new Date()
      }
    });

    await this.recalculateShiftTotals(userId, trip.shift_id);

    return {
      success: true
    };
  }

  private async recalculateShiftTotals(
    userId: string,
    shiftId?: string | null,
    ignoredShiftId?: string | null
  ) {
    if (!shiftId || shiftId === ignoredShiftId) {
      return;
    }

    await this.shiftsService?.recalculateShiftTotals(userId, shiftId);
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

  private async findOwnedShift(userId: string, id: string, vehicleId: string) {
    const shift = await this.prisma.shift.findFirst({
      where: {
        id,
        user_id: userId,
        vehicle_id: vehicleId
      }
    });

    if (!shift) {
      throw new NotFoundException('Shift not found for selected vehicle.');
    }

    return shift;
  }

  private async findOwnedTrip(userId: string, id: string) {
    const trip = await this.prisma.trip.findFirst({
      where: {
        id,
        user_id: userId,
        deleted_at: null
      }
    });

    if (!trip) {
      throw new NotFoundException('Trip not found.');
    }

    return trip;
  }

  private toTripWhereInput(userId: string, query: ListTripsQueryDto) {
    const where: Prisma.TripWhereInput = {
      user_id: userId,
      deleted_at: null
    };

    if (query.vehicleId) {
      where.vehicle_id = query.vehicleId;
    }

    if (query.shiftId) {
      where.shift_id = query.shiftId;
    }

    if (query.paymentMethod) {
      where.payment_method = query.paymentMethod;
    }

    if (query.startDate || query.endDate) {
      where.trip_date = {};

      if (query.startDate) {
        where.trip_date.gte = this.toDate(query.startDate);
      }

      if (query.endDate) {
        where.trip_date.lte = this.toDate(query.endDate);
      }
    }

    return where;
  }

  private toDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date value.');
    }

    return date;
  }

  private toOptionalDate(value?: string | null) {
    if (!value) {
      return null;
    }

    return this.toDate(value);
  }

  private toTripResponse(trip: Trip) {
    return {
      id: trip.id,
      userId: trip.user_id,
      vehicleId: trip.vehicle_id,
      shiftId: trip.shift_id,
      tripDate: trip.trip_date,
      startedAt: trip.started_at,
      endedAt: trip.ended_at,
      durationMinutes: trip.duration_minutes,
      grossIncome: trip.gross_income.toFixed(2),
      tipAmount: trip.tip_amount.toFixed(2),
      cancellationIncome: trip.cancellation_income.toFixed(2),
      totalIncome: trip.total_income.toFixed(2),
      paymentMethod: trip.payment_method as PaymentMethodType,
      pickupLocation: trip.pickup_location,
      dropoffLocation: trip.dropoff_location,
      tripKm: trip.trip_km.toFixed(2),
      deadheadKm: trip.deadhead_km.toFixed(2),
      totalKm: trip.total_km.toFixed(2),
      estimatedFuelCost: trip.estimated_fuel_cost.toFixed(2),
      allocatedPackageCost: trip.allocated_package_cost.toFixed(2),
      allocatedFixedCost: trip.allocated_fixed_cost.toFixed(2),
      allocatedMaintenanceCost: trip.allocated_maintenance_cost.toFixed(2),
      allocatedDepreciationCost: trip.allocated_depreciation_cost.toFixed(2),
      allocatedOtherVariableCost:
        trip.allocated_other_variable_cost.toFixed(2),
      cashNetProfit: trip.cash_net_profit.toFixed(2),
      trueNetProfit: trip.true_net_profit.toFixed(2),
      profitCalculationVersion: trip.profit_calculation_version,
      note: trip.note,
      createdAt: trip.created_at,
      updatedAt: trip.updated_at
    };
  }
}

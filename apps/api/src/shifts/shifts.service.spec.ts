import { BadRequestException } from '@nestjs/common';
import { Prisma, ShiftStatus } from '@prisma/client';
import { ShiftsService } from './shifts.service';

describe('ShiftsService', () => {
  it('calculates active minutes and odometer total km', () => {
    const service = new ShiftsService({} as never);
    const result = (
      service as unknown as {
        calculateShift(input: {
          endedAt: Date;
          endOdometerKm: string;
          startedAt: Date;
          startOdometerKm: string;
        }): {
          activeMinutes: number | null;
          totalKm: Prisma.Decimal | null;
        };
      }
    ).calculateShift({
      endedAt: new Date('2026-06-17T18:30:00+03:00'),
      endOdometerKm: '85142.5',
      startedAt: new Date('2026-06-17T09:00:00+03:00'),
      startOdometerKm: '85000.0'
    });

    expect(result.activeMinutes).toBe(570);
    expect(result.totalKm?.toFixed(1)).toBe('142.5');
  });

  it('rejects negative odometer totals', () => {
    const service = new ShiftsService({} as never);

    expect(() =>
      (
        service as unknown as {
          calculateOdometerTotalKm(
            startOdometerKm: string,
            endOdometerKm: string
          ): Prisma.Decimal | null;
        }
      ).calculateOdometerTotalKm('85142.5', '85000.0')
    ).toThrow(BadRequestException);
  });

  it('maps ended shifts to completed status by default', () => {
    const service = new ShiftsService({} as never);
    const status = (
      service as unknown as {
        resolveStatus(endedAt: Date): ShiftStatus;
      }
    ).resolveStatus(new Date('2026-06-17T18:30:00+03:00'));

    expect(status).toBe(ShiftStatus.COMPLETED);
  });

  it('maps shift responses with fixed decimal strings', () => {
    const service = new ShiftsService({} as never);
    const response = (
      service as unknown as {
        toShiftResponse(shift: Record<string, unknown>): {
          grossIncome: string;
          status: ShiftStatus;
          totalKm: string | null;
        };
      }
    ).toShiftResponse({
      active_minutes: 570,
      calculation_version: null,
      cash_net_profit: new Prisma.Decimal('1250'),
      created_at: new Date('2026-06-17T06:00:00.000Z'),
      end_odometer_km: new Prisma.Decimal('85142.5'),
      ended_at: new Date('2026-06-17T15:30:00.000Z'),
      gross_income: new Prisma.Decimal('1800'),
      id: 'shift_1',
      note: null,
      start_odometer_km: new Prisma.Decimal('85000'),
      started_at: new Date('2026-06-17T06:00:00.000Z'),
      status: ShiftStatus.COMPLETED,
      total_km: new Prisma.Decimal('142.5'),
      true_net_profit: new Prisma.Decimal('1250'),
      updated_at: new Date('2026-06-17T15:30:00.000Z'),
      user_id: 'user_1',
      vehicle_id: 'vehicle_1'
    });

    expect(response.grossIncome).toBe('1800.00');
    expect(response.totalKm).toBe('142.5');
    expect(response.status).toBe(ShiftStatus.COMPLETED);
  });
});

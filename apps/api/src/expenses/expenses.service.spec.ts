import { BadRequestException } from '@nestjs/common';
import { AllocationType, ExpenseType, Prisma } from '@prisma/client';
import { ExpensesService } from './expenses.service';

describe('ExpensesService', () => {
  it('maps expense responses with fixed decimal strings', () => {
    const service = new ExpensesService({} as never);
    const response = (
      service as unknown as {
        toExpenseResponse(expense: Record<string, unknown>): {
          amount: string;
          odometerKm: string | null;
        };
      }
    ).toExpenseResponse({
      allocation_period_end: null,
      allocation_period_start: null,
      allocation_type: AllocationType.IMMEDIATE,
      amount: new Prisma.Decimal('120'),
      category_id: 'cat_1',
      created_at: new Date('2026-06-18T07:00:00.000Z'),
      expense_date: new Date('2026-06-18T00:00:00.000Z'),
      expense_type: ExpenseType.VARIABLE,
      id: 'expense_1',
      is_recurring: false,
      note: 'Otopark',
      odometer_km: new Prisma.Decimal('85120.5'),
      payment_method: 'CARD',
      receipt_url: null,
      updated_at: new Date('2026-06-18T07:00:00.000Z'),
      user_id: 'user_1',
      vehicle_id: 'vehicle_1',
    });

    expect(response.amount).toBe('120.00');
    expect(response.odometerKm).toBe('85120.5');
  });

  it('rejects invalid allocation periods', () => {
    const service = new ExpensesService({} as never);

    expect(() =>
      (
        service as unknown as {
          assertAllocationPeriod(input: {
            allocationPeriodEnd?: string;
            allocationPeriodStart?: string;
          }): void;
        }
      ).assertAllocationPeriod({
        allocationPeriodEnd: '2026-06-01',
        allocationPeriodStart: '2026-06-30',
      }),
    ).toThrow(BadRequestException);
  });
});

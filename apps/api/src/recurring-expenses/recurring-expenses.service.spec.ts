import { BadRequestException } from '@nestjs/common';
import {
  AllocationType,
  ExpenseType,
  FixedCostAllocationMethod,
  Prisma
} from '@prisma/client';
import { RecurringExpensesService } from './recurring-expenses.service';

describe('RecurringExpensesService', () => {
  it('maps recurring expense responses with fixed decimal strings', () => {
    const service = new RecurringExpensesService({} as never);
    const response = (
      service as unknown as {
        toRecurringExpenseResponse(recurringExpense: Record<string, unknown>): {
          amount: string;
          expenseType: ExpenseType;
          period: AllocationType;
        };
      }
    ).toRecurringExpenseResponse({
      allocation_method: FixedCostAllocationMethod.CALENDAR_DAY,
      amount: new Prisma.Decimal('1200'),
      created_at: new Date('2026-06-18T07:00:00.000Z'),
      ends_at: new Date('2027-06-18T00:00:00.000Z'),
      expense_type: ExpenseType.FIXED,
      id: 'rec_1',
      is_active: true,
      name: 'Trafik sigortasi',
      next_due_at: new Date('2026-07-18T00:00:00.000Z'),
      note: null,
      period: AllocationType.MONTHLY,
      starts_at: new Date('2026-06-18T00:00:00.000Z'),
      updated_at: new Date('2026-06-18T07:00:00.000Z'),
      user_id: 'user_1',
      vehicle_id: 'vehicle_1'
    });

    expect(response.amount).toBe('1200.00');
    expect(response.expenseType).toBe(ExpenseType.FIXED);
    expect(response.period).toBe(AllocationType.MONTHLY);
  });

  it('rejects invalid recurring expense date ranges', () => {
    const service = new RecurringExpensesService({} as never);

    expect(() =>
      (
        service as unknown as {
          assertDateRange(startsAt: Date, endsAt?: Date | null): void;
        }
      ).assertDateRange(
        new Date('2026-07-18T00:00:00.000Z'),
        new Date('2026-06-18T00:00:00.000Z')
      )
    ).toThrow(BadRequestException);
  });

  it('rejects nextDueAt outside the active range', () => {
    const service = new RecurringExpensesService({} as never);

    expect(() =>
      (
        service as unknown as {
          assertNextDueWithinRange(
            startsAt: Date,
            endsAt?: Date | null,
            nextDueAt?: Date | null
          ): void;
        }
      ).assertNextDueWithinRange(
        new Date('2026-06-18T00:00:00.000Z'),
        new Date('2026-07-18T00:00:00.000Z'),
        new Date('2026-08-18T00:00:00.000Z')
      )
    ).toThrow(BadRequestException);
  });
});

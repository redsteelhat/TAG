import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  AllocationType,
  ExpenseType,
  FixedCostAllocationMethod,
  Prisma,
  RecurringExpense
} from '@prisma/client';
import { SortDirection } from '../common/dto/pagination-query.dto';
import {
  buildPaginationMeta,
  getPaginationParams
} from '../common/pagination/pagination';
import { buildDateRangeFilter } from '../common/utils/date-range';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecurringExpenseDto } from './dto/create-recurring-expense.dto';
import {
  ListRecurringExpensesQueryDto,
  RecurringExpenseSortBy
} from './dto/list-recurring-expenses-query.dto';
import { UpdateRecurringExpenseDto } from './dto/update-recurring-expense.dto';

@Injectable()
export class RecurringExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateRecurringExpenseDto) {
    const vehicle = await this.findOwnedVehicle(userId, dto.vehicleId);
    const startsAt = this.toDate(dto.startsAt);
    const endsAt = this.toOptionalDate(dto.endsAt);
    const nextDueAt = this.toOptionalDate(dto.nextDueAt) ?? startsAt;

    this.assertDateRange(startsAt, endsAt);
    this.assertNextDueWithinRange(startsAt, endsAt, nextDueAt);

    const recurringExpense = await this.prisma.recurringExpense.create({
      data: {
        user_id: userId,
        vehicle_id: vehicle.id,
        name: dto.name,
        expense_type: dto.expenseType ?? ExpenseType.FIXED,
        amount: dto.amount,
        period: dto.period,
        allocation_method:
          dto.allocationMethod ?? FixedCostAllocationMethod.CALENDAR_DAY,
        starts_at: startsAt,
        ends_at: endsAt,
        next_due_at: nextDueAt,
        is_active: dto.isActive ?? true,
        note: dto.note
      }
    });

    return this.toRecurringExpenseResponse(recurringExpense);
  }

  async findAll(userId: string, query: ListRecurringExpensesQueryDto) {
    const pagination = getPaginationParams(query);
    const where = this.toRecurringExpenseWhereInput(userId, query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.recurringExpense.findMany({
        where,
        orderBy: this.toRecurringExpenseOrderBy(query),
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.recurringExpense.count({
        where
      })
    ]);

    return {
      data: items.map((recurringExpense) =>
        this.toRecurringExpenseResponse(recurringExpense)
      ),
      meta: buildPaginationMeta(pagination, total)
    };
  }

  async findOne(userId: string, id: string) {
    const recurringExpense = await this.findOwnedRecurringExpense(userId, id);

    return this.toRecurringExpenseResponse(recurringExpense);
  }

  async update(userId: string, id: string, dto: UpdateRecurringExpenseDto) {
    const currentRecurringExpense = await this.findOwnedRecurringExpense(
      userId,
      id
    );
    const vehicleId = dto.vehicleId ?? currentRecurringExpense.vehicle_id;
    const vehicle = await this.findOwnedVehicle(userId, vehicleId);
    const startsAt =
      dto.startsAt !== undefined
        ? this.toDate(dto.startsAt)
        : currentRecurringExpense.starts_at;
    const endsAt =
      dto.endsAt !== undefined
        ? this.toOptionalDate(dto.endsAt)
        : currentRecurringExpense.ends_at;
    const nextDueAt =
      dto.nextDueAt !== undefined
        ? this.toOptionalDate(dto.nextDueAt)
        : currentRecurringExpense.next_due_at;

    this.assertDateRange(startsAt, endsAt);
    this.assertNextDueWithinRange(startsAt, endsAt, nextDueAt);

    const recurringExpense = await this.prisma.recurringExpense.update({
      where: {
        id
      },
      data: {
        vehicle_id: vehicle.id,
        name: dto.name ?? currentRecurringExpense.name,
        expense_type: dto.expenseType ?? currentRecurringExpense.expense_type,
        amount: dto.amount ?? currentRecurringExpense.amount,
        period: dto.period ?? currentRecurringExpense.period,
        allocation_method:
          dto.allocationMethod ?? currentRecurringExpense.allocation_method,
        starts_at: startsAt,
        ends_at: endsAt,
        next_due_at: nextDueAt,
        is_active:
          dto.isActive !== undefined
            ? dto.isActive
            : currentRecurringExpense.is_active,
        note:
          dto.note !== undefined ? dto.note : currentRecurringExpense.note
      }
    });

    return this.toRecurringExpenseResponse(recurringExpense);
  }

  async remove(userId: string, id: string) {
    await this.findOwnedRecurringExpense(userId, id);

    await this.prisma.recurringExpense.update({
      where: {
        id
      },
      data: {
        deleted_at: new Date(),
        is_active: false
      }
    });

    return {
      success: true
    };
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

  private async findOwnedRecurringExpense(userId: string, id: string) {
    const recurringExpense = await this.prisma.recurringExpense.findFirst({
      where: {
        id,
        user_id: userId,
        deleted_at: null
      }
    });

    if (!recurringExpense) {
      throw new NotFoundException('Recurring expense not found.');
    }

    return recurringExpense;
  }

  private toRecurringExpenseWhereInput(
    userId: string,
    query: ListRecurringExpensesQueryDto
  ) {
    const where: Prisma.RecurringExpenseWhereInput = {
      user_id: userId,
      deleted_at: null
    };

    if (query.vehicleId) {
      where.vehicle_id = query.vehicleId;
    }

    if (query.expenseType) {
      where.expense_type = query.expenseType;
    }

    if (query.period) {
      where.period = query.period;
    }

    if (query.allocationMethod) {
      where.allocation_method = query.allocationMethod;
    }

    if (query.isActive !== undefined) {
      where.is_active = query.isActive;
    }

    const startsAtRange = buildDateRangeFilter(query);

    if (startsAtRange) {
      where.starts_at = startsAtRange;
    }

    if (query.q) {
      where.OR = [
        {
          name: {
            contains: query.q,
            mode: 'insensitive'
          }
        },
        {
          note: {
            contains: query.q,
            mode: 'insensitive'
          }
        }
      ];
    }

    if (query.minAmount || query.maxAmount) {
      where.amount = {};

      if (query.minAmount) {
        where.amount.gte = query.minAmount;
      }

      if (query.maxAmount) {
        where.amount.lte = query.maxAmount;
      }
    }

    return where;
  }

  private toRecurringExpenseOrderBy(
    query: ListRecurringExpensesQueryDto
  ): Prisma.RecurringExpenseOrderByWithRelationInput[] {
    const direction = query.sortDirection ?? SortDirection.ASC;
    const sortBy = query.sortBy ?? RecurringExpenseSortBy.NEXT_DUE_AT;
    const fieldBySort: Record<
      RecurringExpenseSortBy,
      keyof Prisma.RecurringExpenseOrderByWithRelationInput
    > = {
      [RecurringExpenseSortBy.AMOUNT]: 'amount',
      [RecurringExpenseSortBy.CREATED_AT]: 'created_at',
      [RecurringExpenseSortBy.NEXT_DUE_AT]: 'next_due_at',
      [RecurringExpenseSortBy.STARTS_AT]: 'starts_at'
    };

    return [
      {
        [fieldBySort[sortBy]]: direction
      },
      {
        created_at: 'desc'
      }
    ];
  }

  private assertDateRange(startsAt: Date, endsAt?: Date | null) {
    if (endsAt && startsAt > endsAt) {
      throw new BadRequestException('startsAt must be before endsAt.');
    }
  }

  private assertNextDueWithinRange(
    startsAt: Date,
    endsAt?: Date | null,
    nextDueAt?: Date | null
  ) {
    if (!nextDueAt) {
      return;
    }

    if (nextDueAt < startsAt) {
      throw new BadRequestException('nextDueAt must be after startsAt.');
    }

    if (endsAt && nextDueAt > endsAt) {
      throw new BadRequestException('nextDueAt must be before endsAt.');
    }
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

  private toRecurringExpenseResponse(recurringExpense: RecurringExpense) {
    return {
      id: recurringExpense.id,
      userId: recurringExpense.user_id,
      vehicleId: recurringExpense.vehicle_id,
      name: recurringExpense.name,
      expenseType: recurringExpense.expense_type as ExpenseType,
      amount: recurringExpense.amount.toFixed(2),
      period: recurringExpense.period as AllocationType,
      allocationMethod:
        recurringExpense.allocation_method as FixedCostAllocationMethod,
      startsAt: recurringExpense.starts_at,
      endsAt: recurringExpense.ends_at,
      nextDueAt: recurringExpense.next_due_at,
      isActive: recurringExpense.is_active,
      note: recurringExpense.note,
      createdAt: recurringExpense.created_at,
      updatedAt: recurringExpense.updated_at
    };
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AllocationType,
  Category,
  ExpenseEntry,
  ExpenseType,
  PaymentMethodType,
  Prisma,
} from '@prisma/client';
import { SortDirection } from '../common/dto/pagination-query.dto';
import {
  buildPaginationMeta,
  getPaginationParams,
} from '../common/pagination/pagination';
import { buildDateRangeFilter } from '../common/utils/date-range';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import {
  ExpenseSortBy,
  ListExpensesQueryDto,
} from './dto/list-expenses-query.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateExpenseDto) {
    const vehicle = await this.findOwnedVehicle(userId, dto.vehicleId);
    const category = dto.categoryId
      ? await this.findAvailableCategory(userId, dto.categoryId)
      : null;

    this.assertCategoryMatchesExpenseType(category, dto.expenseType);
    this.assertAllocationPeriod(dto);

    const expense = await this.prisma.expenseEntry.create({
      data: {
        user_id: userId,
        vehicle_id: vehicle.id,
        category_id: dto.categoryId,
        expense_type: dto.expenseType,
        amount: dto.amount,
        expense_date: this.toDate(dto.expenseDate),
        allocation_type: dto.allocationType ?? AllocationType.IMMEDIATE,
        allocation_period_start: this.toOptionalDate(dto.allocationPeriodStart),
        allocation_period_end: this.toOptionalDate(dto.allocationPeriodEnd),
        odometer_km: dto.odometerKm,
        is_recurring: dto.isRecurring ?? false,
        payment_method: dto.paymentMethod,
        receipt_url: dto.receiptUrl,
        note: dto.note,
      },
    });

    return this.toExpenseResponse(expense);
  }

  async findAll(userId: string, query: ListExpensesQueryDto) {
    const pagination = getPaginationParams(query);
    const where = this.toExpenseWhereInput(userId, query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.expenseEntry.findMany({
        where,
        orderBy: this.toExpenseOrderBy(query),
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.expenseEntry.count({
        where,
      }),
    ]);

    return {
      data: items.map((expense) => this.toExpenseResponse(expense)),
      meta: buildPaginationMeta(pagination, total),
    };
  }

  async findOne(userId: string, id: string) {
    const expense = await this.findOwnedExpense(userId, id);

    return this.toExpenseResponse(expense);
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto) {
    const currentExpense = await this.findOwnedExpense(userId, id);
    const vehicleId = dto.vehicleId ?? currentExpense.vehicle_id;
    const vehicle = await this.findOwnedVehicle(userId, vehicleId);
    const categoryId =
      dto.categoryId !== undefined
        ? dto.categoryId
        : currentExpense.category_id;
    const expenseType = dto.expenseType ?? currentExpense.expense_type;
    const category = categoryId
      ? await this.findAvailableCategory(userId, categoryId)
      : null;

    this.assertCategoryMatchesExpenseType(category, expenseType);
    this.assertAllocationPeriod({
      allocationPeriodEnd:
        dto.allocationPeriodEnd !== undefined
          ? dto.allocationPeriodEnd
          : currentExpense.allocation_period_end?.toISOString(),
      allocationPeriodStart:
        dto.allocationPeriodStart !== undefined
          ? dto.allocationPeriodStart
          : currentExpense.allocation_period_start?.toISOString(),
    });

    const expense = await this.prisma.expenseEntry.update({
      where: {
        id,
      },
      data: {
        vehicle_id: vehicle.id,
        category_id: categoryId,
        expense_type: expenseType,
        amount: dto.amount ?? currentExpense.amount,
        expense_date:
          dto.expenseDate !== undefined
            ? this.toDate(dto.expenseDate)
            : currentExpense.expense_date,
        allocation_type: dto.allocationType ?? currentExpense.allocation_type,
        allocation_period_start:
          dto.allocationPeriodStart !== undefined
            ? this.toOptionalDate(dto.allocationPeriodStart)
            : currentExpense.allocation_period_start,
        allocation_period_end:
          dto.allocationPeriodEnd !== undefined
            ? this.toOptionalDate(dto.allocationPeriodEnd)
            : currentExpense.allocation_period_end,
        odometer_km:
          dto.odometerKm !== undefined
            ? dto.odometerKm
            : currentExpense.odometer_km,
        is_recurring:
          dto.isRecurring !== undefined
            ? dto.isRecurring
            : currentExpense.is_recurring,
        payment_method:
          dto.paymentMethod !== undefined
            ? dto.paymentMethod
            : currentExpense.payment_method,
        receipt_url:
          dto.receiptUrl !== undefined
            ? dto.receiptUrl
            : currentExpense.receipt_url,
        note: dto.note !== undefined ? dto.note : currentExpense.note,
      },
    });

    return this.toExpenseResponse(expense);
  }

  async remove(userId: string, id: string) {
    await this.findOwnedExpense(userId, id);

    await this.prisma.expenseEntry.update({
      where: {
        id,
      },
      data: {
        deleted_at: new Date(),
      },
    });

    return {
      success: true,
    };
  }

  private async findOwnedVehicle(userId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id,
        user_id: userId,
        deleted_at: null,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    return vehicle;
  }

  private async findAvailableCategory(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        is_active: true,
        OR: [
          {
            user_id: userId,
          },
          {
            is_system: true,
          },
        ],
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    return category;
  }

  private async findOwnedExpense(userId: string, id: string) {
    const expense = await this.prisma.expenseEntry.findFirst({
      where: {
        id,
        user_id: userId,
        deleted_at: null,
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense entry not found.');
    }

    return expense;
  }

  private assertCategoryMatchesExpenseType(
    category: Category | null,
    expenseType: ExpenseType,
  ) {
    if (category?.expense_type && category.expense_type !== expenseType) {
      throw new BadRequestException(
        'Category expense type does not match expense type.',
      );
    }
  }

  private toExpenseWhereInput(userId: string, query: ListExpensesQueryDto) {
    const where: Prisma.ExpenseEntryWhereInput = {
      user_id: userId,
      deleted_at: null,
    };

    if (query.vehicleId) {
      where.vehicle_id = query.vehicleId;
    }

    if (query.categoryId) {
      where.category_id = query.categoryId;
    }

    if (query.expenseType) {
      where.expense_type = query.expenseType;
    }

    if (query.allocationType) {
      where.allocation_type = query.allocationType;
    }

    if (query.paymentMethod) {
      where.payment_method = query.paymentMethod;
    }

    if (query.isRecurring !== undefined) {
      where.is_recurring = query.isRecurring;
    }

    const expenseDateRange = buildDateRangeFilter(query);

    if (expenseDateRange) {
      where.expense_date = expenseDateRange;
    }

    if (query.q) {
      where.OR = [
        {
          note: {
            contains: query.q,
            mode: 'insensitive',
          },
        },
        {
          receipt_url: {
            contains: query.q,
            mode: 'insensitive',
          },
        },
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

  private toExpenseOrderBy(
    query: ListExpensesQueryDto,
  ): Prisma.ExpenseEntryOrderByWithRelationInput[] {
    const direction = query.sortDirection ?? SortDirection.DESC;
    const sortBy = query.sortBy ?? ExpenseSortBy.EXPENSE_DATE;
    const fieldBySort: Record<
      ExpenseSortBy,
      keyof Prisma.ExpenseEntryOrderByWithRelationInput
    > = {
      [ExpenseSortBy.AMOUNT]: 'amount',
      [ExpenseSortBy.CREATED_AT]: 'created_at',
      [ExpenseSortBy.EXPENSE_DATE]: 'expense_date',
    };

    return [
      {
        [fieldBySort[sortBy]]: direction,
      },
      {
        created_at: 'desc',
      },
    ];
  }

  private assertAllocationPeriod(input: {
    allocationPeriodEnd?: string | null;
    allocationPeriodStart?: string | null;
  }) {
    if (!input.allocationPeriodStart || !input.allocationPeriodEnd) {
      return;
    }

    const start = this.toDate(input.allocationPeriodStart);
    const end = this.toDate(input.allocationPeriodEnd);

    if (start > end) {
      throw new BadRequestException(
        'allocationPeriodStart must be before allocationPeriodEnd.',
      );
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

  private toExpenseResponse(expense: ExpenseEntry) {
    return {
      id: expense.id,
      userId: expense.user_id,
      vehicleId: expense.vehicle_id,
      categoryId: expense.category_id,
      expenseType: expense.expense_type,
      amount: expense.amount.toFixed(2),
      expenseDate: expense.expense_date,
      allocationType: expense.allocation_type,
      allocationPeriodStart: expense.allocation_period_start,
      allocationPeriodEnd: expense.allocation_period_end,
      odometerKm: expense.odometer_km?.toFixed(1) ?? null,
      isRecurring: expense.is_recurring,
      paymentMethod: expense.payment_method as PaymentMethodType | null,
      receiptUrl: expense.receipt_url,
      note: expense.note,
      createdAt: expense.created_at,
      updatedAt: expense.updated_at,
    };
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLog } from '../audit/audit-log.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateRecurringExpenseDto } from './dto/create-recurring-expense.dto';
import { ListRecurringExpensesQueryDto } from './dto/list-recurring-expenses-query.dto';
import { UpdateRecurringExpenseDto } from './dto/update-recurring-expense.dto';
import { RecurringExpensesService } from './recurring-expenses.service';

@UseGuards(JwtAuthGuard)
@Controller('recurring-expenses')
@ApiTags('Recurring Expenses')
@ApiBearerAuth('access-token')
export class RecurringExpensesController {
  constructor(
    private readonly recurringExpensesService: RecurringExpensesService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a recurring expense for the current user' })
  @AuditLog({
    action: 'recurring_expense.create',
    entityType: 'recurring_expense',
    entityIdPath: 'data.id'
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRecurringExpenseDto
  ) {
    return {
      data: await this.recurringExpensesService.create(user.id, dto)
    };
  }

  @Get()
  @ApiOperation({ summary: 'List current user recurring expenses' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListRecurringExpensesQueryDto
  ) {
    return this.recurringExpensesService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a recurring expense by id' })
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      data: await this.recurringExpensesService.findOne(user.id, id)
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a recurring expense by id' })
  @AuditLog({
    action: 'recurring_expense.update',
    entityType: 'recurring_expense',
    entityIdParam: 'id'
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringExpenseDto
  ) {
    return {
      data: await this.recurringExpensesService.update(user.id, id, dto)
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a recurring expense by id' })
  @AuditLog({
    action: 'recurring_expense.delete',
    entityType: 'recurring_expense',
    entityIdParam: 'id'
  })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      data: await this.recurringExpensesService.remove(user.id, id)
    };
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLog } from '../audit/audit-log.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

@UseGuards(JwtAuthGuard)
@Controller('expenses')
@ApiTags('Expenses')
@ApiBearerAuth('access-token')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({ summary: 'Create an expense entry for the current user' })
  @AuditLog({
    action: 'expense.create',
    entityType: 'expense_entry',
    entityIdPath: 'data.id',
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExpenseDto,
  ) {
    return {
      data: await this.expensesService.create(user.id, dto),
    };
  }

  @Get()
  @ApiOperation({ summary: 'List current user expense entries' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListExpensesQueryDto,
  ) {
    return this.expensesService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an expense entry by id' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return {
      data: await this.expensesService.findOne(user.id, id),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an expense entry by id' })
  @AuditLog({
    action: 'expense.update',
    entityType: 'expense_entry',
    entityIdParam: 'id',
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return {
      data: await this.expensesService.update(user.id, id, dto),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete an expense entry by id' })
  @AuditLog({
    action: 'expense.delete',
    entityType: 'expense_entry',
    entityIdParam: 'id',
  })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return {
      data: await this.expensesService.remove(user.id, id),
    };
  }
}

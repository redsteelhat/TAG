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
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { ListPaymentMethodsQueryDto } from './dto/list-payment-methods-query.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PaymentMethodsService } from './payment-methods.service';

@UseGuards(JwtAuthGuard)
@Controller('payment-methods')
@ApiTags('Payment Methods')
@ApiBearerAuth('access-token')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a custom payment method' })
  @AuditLog({
    action: 'payment_method.create',
    entityType: 'payment_method',
    entityIdPath: 'data.id'
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePaymentMethodDto
  ) {
    return {
      data: await this.paymentMethodsService.create(user.id, dto)
    };
  }

  @Get()
  @ApiOperation({ summary: 'List system and custom payment methods' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListPaymentMethodsQueryDto
  ) {
    return {
      data: await this.paymentMethodsService.findAll(user.id, query)
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a payment method by id' })
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      data: await this.paymentMethodsService.findOne(user.id, id)
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a custom payment method' })
  @AuditLog({
    action: 'payment_method.update',
    entityType: 'payment_method',
    entityIdParam: 'id'
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto
  ) {
    return {
      data: await this.paymentMethodsService.update(user.id, id, dto)
    };
  }

  @Post(':id/set-default')
  @ApiOperation({ summary: 'Set a custom payment method as default' })
  @AuditLog({
    action: 'payment_method.set_default',
    entityType: 'payment_method',
    entityIdParam: 'id'
  })
  async setDefault(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    return {
      data: await this.paymentMethodsService.setDefault(user.id, id)
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a custom payment method' })
  @AuditLog({
    action: 'payment_method.delete',
    entityType: 'payment_method',
    entityIdParam: 'id'
  })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      data: await this.paymentMethodsService.remove(user.id, id)
    };
  }
}

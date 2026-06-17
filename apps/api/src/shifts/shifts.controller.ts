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
import { CreateShiftDto } from './dto/create-shift.dto';
import { ListShiftsQueryDto } from './dto/list-shifts-query.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { ShiftsService } from './shifts.service';

@UseGuards(JwtAuthGuard)
@Controller('shifts')
@ApiTags('Shifts')
@ApiBearerAuth('access-token')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a shift for the current user' })
  @AuditLog({
    action: 'shift.create',
    entityType: 'shift',
    entityIdPath: 'data.id'
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateShiftDto
  ) {
    return {
      data: await this.shiftsService.create(user.id, dto)
    };
  }

  @Get()
  @ApiOperation({ summary: 'List current user shifts' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListShiftsQueryDto
  ) {
    return this.shiftsService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a shift by id' })
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      data: await this.shiftsService.findOne(user.id, id)
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a shift by id' })
  @AuditLog({
    action: 'shift.update',
    entityType: 'shift',
    entityIdParam: 'id'
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateShiftDto
  ) {
    return {
      data: await this.shiftsService.update(user.id, id, dto)
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a shift by id' })
  @AuditLog({
    action: 'shift.delete',
    entityType: 'shift',
    entityIdParam: 'id'
  })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      data: await this.shiftsService.remove(user.id, id)
    };
  }
}

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
import { CreateTripDto } from './dto/create-trip.dto';
import { ListTripsQueryDto } from './dto/list-trips-query.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripsService } from './trips.service';

@UseGuards(JwtAuthGuard)
@Controller('trips')
@ApiTags('Trips')
@ApiBearerAuth('access-token')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a trip for the current user' })
  @AuditLog({
    action: 'trip.create',
    entityType: 'trip',
    entityIdPath: 'data.id'
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTripDto
  ) {
    return {
      data: await this.tripsService.create(user.id, dto)
    };
  }

  @Get()
  @ApiOperation({ summary: 'List current user trips' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListTripsQueryDto
  ) {
    return this.tripsService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a trip by id' })
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      data: await this.tripsService.findOne(user.id, id)
    };
  }

  @Get(':id/profit-breakdown')
  @ApiOperation({ summary: 'Get trip-level net profit breakdown' })
  async getProfitBreakdown(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    return {
      data: await this.tripsService.getProfitBreakdown(user.id, id)
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a trip by id' })
  @AuditLog({
    action: 'trip.update',
    entityType: 'trip',
    entityIdParam: 'id'
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTripDto
  ) {
    return {
      data: await this.tripsService.update(user.id, id, dto)
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a trip by id' })
  @AuditLog({
    action: 'trip.delete',
    entityType: 'trip',
    entityIdParam: 'id'
  })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      data: await this.tripsService.remove(user.id, id)
    };
  }
}

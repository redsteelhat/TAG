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
import { CreateFuelEntryDto } from './dto/create-fuel-entry.dto';
import { ListFuelEntriesQueryDto } from './dto/list-fuel-entries-query.dto';
import { UpdateFuelEntryDto } from './dto/update-fuel-entry.dto';
import { FuelEntriesService } from './fuel-entries.service';

@UseGuards(JwtAuthGuard)
@Controller('fuel-entries')
@ApiTags('Fuel Entries')
@ApiBearerAuth('access-token')
export class FuelEntriesController {
  constructor(private readonly fuelEntriesService: FuelEntriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a fuel entry for the current user' })
  @AuditLog({
    action: 'fuel_entry.create',
    entityType: 'fuel_entry',
    entityIdPath: 'data.id'
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFuelEntryDto
  ) {
    return {
      data: await this.fuelEntriesService.create(user.id, dto)
    };
  }

  @Get()
  @ApiOperation({ summary: 'List current user fuel entries' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListFuelEntriesQueryDto
  ) {
    return this.fuelEntriesService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a fuel entry by id' })
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      data: await this.fuelEntriesService.findOne(user.id, id)
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a fuel entry by id' })
  @AuditLog({
    action: 'fuel_entry.update',
    entityType: 'fuel_entry',
    entityIdParam: 'id'
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateFuelEntryDto
  ) {
    return {
      data: await this.fuelEntriesService.update(user.id, id, dto)
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a fuel entry by id' })
  @AuditLog({
    action: 'fuel_entry.delete',
    entityType: 'fuel_entry',
    entityIdParam: 'id'
  })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      data: await this.fuelEntriesService.remove(user.id, id)
    };
  }
}

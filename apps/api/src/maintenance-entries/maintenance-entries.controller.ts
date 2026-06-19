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
import { CreateMaintenanceEntryDto } from './dto/create-maintenance-entry.dto';
import { ListMaintenanceEntriesQueryDto } from './dto/list-maintenance-entries-query.dto';
import { UpdateMaintenanceEntryDto } from './dto/update-maintenance-entry.dto';
import { MaintenanceEntriesService } from './maintenance-entries.service';

@UseGuards(JwtAuthGuard)
@Controller('maintenance-entries')
@ApiTags('Maintenance Entries')
@ApiBearerAuth('access-token')
export class MaintenanceEntriesController {
  constructor(
    private readonly maintenanceEntriesService: MaintenanceEntriesService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a maintenance entry for the current user' })
  @AuditLog({
    action: 'maintenance_entry.create',
    entityType: 'maintenance_entry',
    entityIdPath: 'data.id'
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMaintenanceEntryDto
  ) {
    return {
      data: await this.maintenanceEntriesService.create(user.id, dto)
    };
  }

  @Get()
  @ApiOperation({ summary: 'List current user maintenance entries' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMaintenanceEntriesQueryDto
  ) {
    return this.maintenanceEntriesService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a maintenance entry by id' })
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      data: await this.maintenanceEntriesService.findOne(user.id, id)
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a maintenance entry by id' })
  @AuditLog({
    action: 'maintenance_entry.update',
    entityType: 'maintenance_entry',
    entityIdParam: 'id'
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceEntryDto
  ) {
    return {
      data: await this.maintenanceEntriesService.update(user.id, id, dto)
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a maintenance entry by id' })
  @AuditLog({
    action: 'maintenance_entry.delete',
    entityType: 'maintenance_entry',
    entityIdParam: 'id'
  })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      data: await this.maintenanceEntriesService.remove(user.id, id)
    };
  }
}

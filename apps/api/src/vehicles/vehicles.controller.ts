import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLog } from '../audit/audit-log.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateDepreciationSettingsDto } from './dto/update-depreciation-settings.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@UseGuards(JwtAuthGuard)
@Controller('vehicles')
@ApiTags('Vehicles')
@ApiBearerAuth('access-token')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a vehicle for the current user' })
  @AuditLog({
    action: 'vehicle.create',
    entityType: 'vehicle',
    entityIdPath: 'data.id'
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateVehicleDto
  ) {
    return {
      data: await this.vehiclesService.create(user.id, dto)
    };
  }

  @Get()
  @ApiOperation({ summary: 'List current user vehicles' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return {
      data: await this.vehiclesService.findAll(user.id)
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a vehicle by id' })
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      data: await this.vehiclesService.findOne(user.id, id)
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a vehicle by id' })
  @AuditLog({
    action: 'vehicle.update',
    entityType: 'vehicle',
    entityIdParam: 'id'
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto
  ) {
    return {
      data: await this.vehiclesService.update(user.id, id, dto)
    };
  }

  @Patch(':id/depreciation-settings')
  @ApiOperation({ summary: 'Update vehicle depreciation settings' })
  @AuditLog({
    action: 'vehicle.update_depreciation_settings',
    entityType: 'vehicle',
    entityIdParam: 'id'
  })
  async updateDepreciationSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDepreciationSettingsDto
  ) {
    return {
      data: await this.vehiclesService.updateDepreciationSettings(
        user.id,
        id,
        dto
      )
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a vehicle by id' })
  @AuditLog({
    action: 'vehicle.delete',
    entityType: 'vehicle',
    entityIdParam: 'id'
  })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      data: await this.vehiclesService.remove(user.id, id)
    };
  }

  @Post(':id/set-active')
  @ApiOperation({ summary: 'Set a vehicle as active for the current user' })
  @AuditLog({
    action: 'vehicle.set_active',
    entityType: 'vehicle',
    entityIdParam: 'id'
  })
  async setActive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    return {
      data: await this.vehiclesService.setActive(user.id, id)
    };
  }
}

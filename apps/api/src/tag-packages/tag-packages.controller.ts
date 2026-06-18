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
import { CreateTagPackageDto } from './dto/create-tag-package.dto';
import { ListTagPackagesQueryDto } from './dto/list-tag-packages-query.dto';
import { UpdateTagPackageDto } from './dto/update-tag-package.dto';
import { TagPackagesService } from './tag-packages.service';

@UseGuards(JwtAuthGuard)
@Controller('tag-packages')
@ApiTags('TAG Packages')
@ApiBearerAuth('access-token')
export class TagPackagesController {
  constructor(private readonly tagPackagesService: TagPackagesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a TAG package for the current user' })
  @AuditLog({
    action: 'tag_package.create',
    entityType: 'tag_package',
    entityIdPath: 'data.id'
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTagPackageDto
  ) {
    return {
      data: await this.tagPackagesService.create(user.id, dto)
    };
  }

  @Get()
  @ApiOperation({ summary: 'List current user TAG packages' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListTagPackagesQueryDto
  ) {
    return this.tagPackagesService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a TAG package by id' })
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      data: await this.tagPackagesService.findOne(user.id, id)
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a TAG package by id' })
  @AuditLog({
    action: 'tag_package.update',
    entityType: 'tag_package',
    entityIdParam: 'id'
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTagPackageDto
  ) {
    return {
      data: await this.tagPackagesService.update(user.id, id, dto)
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a TAG package by id' })
  @AuditLog({
    action: 'tag_package.delete',
    entityType: 'tag_package',
    entityIdParam: 'id'
  })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      data: await this.tagPackagesService.remove(user.id, id)
    };
  }
}

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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@UseGuards(JwtAuthGuard)
@Controller('categories')
@ApiTags('Categories')
@ApiBearerAuth('access-token')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a custom expense category' })
  @AuditLog({
    action: 'category.create',
    entityType: 'category',
    entityIdPath: 'data.id'
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCategoryDto
  ) {
    return {
      data: await this.categoriesService.create(user.id, dto)
    };
  }

  @Get()
  @ApiOperation({ summary: 'List system and custom expense categories' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCategoriesQueryDto
  ) {
    return this.categoriesService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an expense category by id' })
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      data: await this.categoriesService.findOne(user.id, id)
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a custom expense category by id' })
  @AuditLog({
    action: 'category.update',
    entityType: 'category',
    entityIdParam: 'id'
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto
  ) {
    return {
      data: await this.categoriesService.update(user.id, id, dto)
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a custom expense category by id' })
  @AuditLog({
    action: 'category.delete',
    entityType: 'category',
    entityIdParam: 'id'
  })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      data: await this.categoriesService.remove(user.id, id)
    };
  }
}

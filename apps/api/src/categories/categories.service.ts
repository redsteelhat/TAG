import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Category, Prisma } from '@prisma/client';
import { SortDirection } from '../common/dto/pagination-query.dto';
import {
  buildPaginationMeta,
  getPaginationParams
} from '../common/pagination/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import {
  CategorySortBy,
  ListCategoriesQueryDto
} from './dto/list-categories-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCategoryDto) {
    const name = this.normalizeName(dto.name);

    await this.assertCategoryNameAvailable(userId, name);

    const category = await this.prisma.category.create({
      data: {
        user_id: userId,
        name,
        expense_type: dto.expenseType,
        is_system: false,
        is_active: dto.isActive ?? true
      }
    });

    return this.toCategoryResponse(category);
  }

  async findAll(userId: string, query: ListCategoriesQueryDto) {
    const pagination = getPaginationParams(query);
    const where = this.toCategoryWhereInput(userId, query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        orderBy: this.toCategoryOrderBy(query),
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.category.count({
        where
      })
    ]);

    return {
      data: items.map((category) => this.toCategoryResponse(category)),
      meta: buildPaginationMeta(pagination, total)
    };
  }

  async findOne(userId: string, id: string) {
    const category = await this.findVisibleCategory(userId, id);

    return this.toCategoryResponse(category);
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.findOwnedCustomCategory(userId, id);
    const name = dto.name !== undefined ? this.normalizeName(dto.name) : null;

    if (name && name !== category.name) {
      await this.assertCategoryNameAvailable(userId, name, category.id);
    }

    const updatedCategory = await this.prisma.category.update({
      where: {
        id
      },
      data: {
        name: name ?? category.name,
        expense_type:
          dto.expenseType !== undefined
            ? dto.expenseType
            : category.expense_type,
        is_active:
          dto.isActive !== undefined ? dto.isActive : category.is_active
      }
    });

    return this.toCategoryResponse(updatedCategory);
  }

  async remove(userId: string, id: string) {
    await this.findOwnedCustomCategory(userId, id);

    await this.prisma.category.update({
      where: {
        id
      },
      data: {
        is_active: false
      }
    });

    return {
      success: true
    };
  }

  private toCategoryWhereInput(userId: string, query: ListCategoriesQueryDto) {
    const where: Prisma.CategoryWhereInput = {
      OR: [
        {
          user_id: userId
        },
        {
          is_system: true
        }
      ]
    };

    if (!query.includeInactive) {
      where.is_active = true;
    }

    if (query.isSystem !== undefined) {
      where.is_system = query.isSystem;
      where.OR = query.isSystem
        ? [
            {
              is_system: true
            }
          ]
        : [
            {
              user_id: userId,
              is_system: false
            }
          ];
    }

    if (query.expenseType) {
      where.expense_type = query.expenseType;
    }

    if (query.q) {
      const existingOr = where.OR;
      const searchCondition: Prisma.CategoryWhereInput = {
        name: {
          contains: query.q,
          mode: 'insensitive'
        }
      };

      where.AND = [
        {
          OR: existingOr
        },
        searchCondition
      ];
      delete where.OR;
    }

    return where;
  }

  private toCategoryOrderBy(
    query: ListCategoriesQueryDto
  ): Prisma.CategoryOrderByWithRelationInput[] {
    const direction = query.sortDirection ?? SortDirection.ASC;
    const sortBy = query.sortBy ?? CategorySortBy.NAME;
    const fieldBySort: Record<
      CategorySortBy,
      keyof Prisma.CategoryOrderByWithRelationInput
    > = {
      [CategorySortBy.CREATED_AT]: 'created_at',
      [CategorySortBy.NAME]: 'name',
      [CategorySortBy.UPDATED_AT]: 'updated_at'
    };

    return [
      {
        [fieldBySort[sortBy]]: direction
      },
      {
        is_system: 'desc'
      },
      {
        created_at: 'desc'
      }
    ];
  }

  private async findVisibleCategory(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        OR: [
          {
            user_id: userId
          },
          {
            is_system: true
          }
        ]
      }
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    return category;
  }

  private async findOwnedCustomCategory(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        user_id: userId,
        is_system: false
      }
    });

    if (!category) {
      const visibleCategory = await this.findVisibleCategory(userId, id).catch(
        () => null
      );

      if (visibleCategory?.is_system) {
        throw new ForbiddenException('System categories cannot be modified.');
      }

      throw new NotFoundException('Category not found.');
    }

    return category;
  }

  private async assertCategoryNameAvailable(
    userId: string,
    name: string,
    ignoredCategoryId?: string
  ) {
    const existingCategory = await this.prisma.category.findFirst({
      where: {
        id: ignoredCategoryId
          ? {
              not: ignoredCategoryId
            }
          : undefined,
        name: {
          equals: name,
          mode: 'insensitive'
        },
        OR: [
          {
            user_id: userId
          },
          {
            is_system: true
          }
        ]
      }
    });

    if (existingCategory) {
      throw new ConflictException('Category name already exists.');
    }
  }

  private normalizeName(name: string) {
    const normalizedName = name.trim().replace(/\s+/g, ' ');

    if (!normalizedName) {
      throw new BadRequestException('Category name is required.');
    }

    return normalizedName;
  }

  private toCategoryResponse(category: Category) {
    return {
      id: category.id,
      userId: category.user_id,
      name: category.name,
      expenseType: category.expense_type,
      isSystem: category.is_system,
      isActive: category.is_active,
      createdAt: category.created_at,
      updatedAt: category.updated_at
    };
  }
}

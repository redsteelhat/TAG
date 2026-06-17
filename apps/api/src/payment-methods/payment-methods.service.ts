import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { ListPaymentMethodsQueryDto } from './dto/list-payment-methods-query.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreatePaymentMethodDto) {
    const name = this.normalizeName(dto.name);
    await this.assertUniqueActiveName(userId, name);

    const paymentMethod = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await this.clearUserDefaults(tx, userId);
      }

      return tx.paymentMethod.create({
        data: {
          user_id: userId,
          type: dto.type,
          name,
          is_default: dto.isDefault ?? false
        }
      });
    });

    return this.toPaymentMethodResponse(paymentMethod);
  }

  async findAll(userId: string, query: ListPaymentMethodsQueryDto) {
    const paymentMethods = await this.prisma.paymentMethod.findMany({
      where: {
        OR: [{ user_id: userId }, { user_id: null }],
        type: query.type,
        is_active: query.isActive ?? true,
        deleted_at: null
      },
      orderBy: [
        {
          user_id: 'asc'
        },
        {
          is_default: 'desc'
        },
        {
          created_at: 'asc'
        }
      ]
    });

    return paymentMethods.map((paymentMethod) =>
      this.toPaymentMethodResponse(paymentMethod)
    );
  }

  async findOne(userId: string, id: string) {
    const paymentMethod = await this.findVisiblePaymentMethod(userId, id);

    return this.toPaymentMethodResponse(paymentMethod);
  }

  async update(userId: string, id: string, dto: UpdatePaymentMethodDto) {
    const currentPaymentMethod = await this.findOwnedPaymentMethod(userId, id);
    const name =
      dto.name !== undefined ? this.normalizeName(dto.name) : undefined;

    if (name && name !== currentPaymentMethod.name) {
      await this.assertUniqueActiveName(userId, name, id);
    }

    const paymentMethod = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await this.clearUserDefaults(tx, userId);
      }

      return tx.paymentMethod.update({
        where: {
          id
        },
        data: {
          type: dto.type,
          name,
          is_default: dto.isDefault,
          is_active: dto.isActive
        }
      });
    });

    return this.toPaymentMethodResponse(paymentMethod);
  }

  async setDefault(userId: string, id: string) {
    await this.findOwnedPaymentMethod(userId, id);

    const paymentMethod = await this.prisma.$transaction(async (tx) => {
      await this.clearUserDefaults(tx, userId);

      return tx.paymentMethod.update({
        where: {
          id
        },
        data: {
          is_default: true,
          is_active: true,
          deleted_at: null
        }
      });
    });

    return this.toPaymentMethodResponse(paymentMethod);
  }

  async remove(userId: string, id: string) {
    const paymentMethod = await this.findOwnedPaymentMethod(userId, id);

    if (paymentMethod.is_default) {
      throw new BadRequestException(
        'Default payment method cannot be deleted before another default is selected.'
      );
    }

    await this.prisma.paymentMethod.update({
      where: {
        id
      },
      data: {
        is_active: false,
        deleted_at: new Date()
      }
    });

    return {
      success: true
    };
  }

  private async findVisiblePaymentMethod(userId: string, id: string) {
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: {
        id,
        OR: [{ user_id: userId }, { user_id: null }],
        deleted_at: null
      }
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found.');
    }

    return paymentMethod;
  }

  private async findOwnedPaymentMethod(userId: string, id: string) {
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: {
        id,
        user_id: userId,
        deleted_at: null
      }
    });

    if (!paymentMethod) {
      throw new NotFoundException('Custom payment method not found.');
    }

    return paymentMethod;
  }

  private async assertUniqueActiveName(
    userId: string,
    name: string,
    ignoredId?: string
  ) {
    const existingPaymentMethod = await this.prisma.paymentMethod.findFirst({
      where: {
        id: ignoredId
          ? {
              not: ignoredId
            }
          : undefined,
        user_id: userId,
        name,
        deleted_at: null
      }
    });

    if (existingPaymentMethod) {
      throw new ConflictException('Payment method name already exists.');
    }
  }

  private async clearUserDefaults(
    tx: Prisma.TransactionClient,
    userId: string
  ) {
    await tx.paymentMethod.updateMany({
      where: {
        user_id: userId,
        deleted_at: null
      },
      data: {
        is_default: false
      }
    });
  }

  private normalizeName(name: string) {
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new BadRequestException('Payment method name is required.');
    }

    return normalizedName;
  }

  private toPaymentMethodResponse(paymentMethod: PaymentMethod) {
    return {
      id: paymentMethod.id,
      type: paymentMethod.type,
      name: paymentMethod.name,
      isSystem: paymentMethod.user_id === null,
      isDefault: paymentMethod.is_default,
      isActive: paymentMethod.is_active,
      createdAt: paymentMethod.created_at,
      updatedAt: paymentMethod.updated_at
    };
  }
}

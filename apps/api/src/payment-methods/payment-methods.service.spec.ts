import { BadRequestException } from '@nestjs/common';
import { PaymentMethodType } from '@prisma/client';
import { PaymentMethodsService } from './payment-methods.service';

describe('PaymentMethodsService', () => {
  it('normalizes payment method names', () => {
    const service = new PaymentMethodsService({} as never);
    const normalizedName = (
      service as unknown as {
        normalizeName(name: string): string;
      }
    ).normalizeName('  Papara  ');

    expect(normalizedName).toBe('Papara');
  });

  it('rejects blank payment method names', () => {
    const service = new PaymentMethodsService({} as never);

    expect(() =>
      (
        service as unknown as {
          normalizeName(name: string): string;
        }
      ).normalizeName('   ')
    ).toThrow(BadRequestException);
  });

  it('maps system payment methods', () => {
    const service = new PaymentMethodsService({} as never);
    const response = (
      service as unknown as {
        toPaymentMethodResponse(paymentMethod: Record<string, unknown>): {
          isSystem: boolean;
          name: string;
          type: PaymentMethodType;
        };
      }
    ).toPaymentMethodResponse({
      created_at: new Date('2026-06-17T00:00:00.000Z'),
      deleted_at: null,
      id: 'pay_cash',
      is_active: true,
      is_default: true,
      name: 'Nakit',
      type: PaymentMethodType.CASH,
      updated_at: new Date('2026-06-17T00:00:00.000Z'),
      user_id: null
    });

    expect(response.isSystem).toBe(true);
    expect(response.name).toBe('Nakit');
    expect(response.type).toBe(PaymentMethodType.CASH);
  });
});

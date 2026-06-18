import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ExpenseType } from '@prisma/client';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  it('maps category responses', () => {
    const service = new CategoriesService({} as never);
    const response = (
      service as unknown as {
        toCategoryResponse(category: Record<string, unknown>): {
          expenseType: ExpenseType;
          isSystem: boolean;
          name: string;
        };
      }
    ).toCategoryResponse({
      created_at: new Date('2026-06-18T07:00:00.000Z'),
      expense_type: ExpenseType.VARIABLE,
      id: 'cat_1',
      is_active: true,
      is_system: false,
      name: 'Kopru gecisi',
      updated_at: new Date('2026-06-18T07:00:00.000Z'),
      user_id: 'user_1'
    });

    expect(response.name).toBe('Kopru gecisi');
    expect(response.expenseType).toBe(ExpenseType.VARIABLE);
    expect(response.isSystem).toBe(false);
  });

  it('normalizes category names', () => {
    const service = new CategoriesService({} as never);
    const normalizedName = (
      service as unknown as {
        normalizeName(name: string): string;
      }
    ).normalizeName('  Kopru   gecisi  ');

    expect(normalizedName).toBe('Kopru gecisi');
  });

  it('rejects blank category names', () => {
    const service = new CategoriesService({} as never);

    expect(() =>
      (
        service as unknown as {
          normalizeName(name: string): string;
        }
      ).normalizeName('   ')
    ).toThrow(BadRequestException);
  });

  it('rejects system category updates', async () => {
    const service = new CategoriesService({
      category: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: 'cat_system',
            is_system: true
          })
      }
    } as never);

    await expect(
      (
        service as unknown as {
          findOwnedCustomCategory(userId: string, id: string): Promise<unknown>;
        }
      ).findOwnedCustomCategory('user_1', 'cat_system')
    ).rejects.toThrow(ForbiddenException);
  });
});

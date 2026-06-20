import { NotificationStatus } from '@prisma/client';
import { PrivacyService } from './privacy.service';

const activeUser = {
  anonymized_at: null,
  created_at: new Date('2026-06-20T00:00:00.000Z'),
  deleted_at: null,
  email: 'surucu@example.com',
  erasure_requested_at: null,
  explicit_consent_accepted_at: null,
  explicit_consent_version: null,
  full_name: 'Ali Yilmaz',
  id: 'user_1',
  kvkk_accepted_at: null,
  kvkk_version: null,
  locale: 'tr-TR',
  password_hash: 'hash',
  phone: '+905551112233',
  privacy_notice_accepted_at: null,
  privacy_notice_version: null,
  role: 'USER',
  subscription_status: 'TRIAL',
  timezone: 'Europe/Istanbul',
  trial_ends_at: null,
  updated_at: new Date('2026-06-20T00:00:00.000Z')
};

describe('PrivacyService', () => {
  it('rejects consent updates without mandatory KVKK acceptance', async () => {
    const service = new PrivacyService({} as never, {} as never);

    await expect(
      service.acceptConsent('user_1', {
        kvkkAccepted: false
      })
    ).rejects.toThrow('KVKK and privacy notice acceptance is required.');
  });

  it('records KVKK and explicit consent status', async () => {
    const consentDate = new Date('2026-06-20T10:00:00.000Z');
    const prisma = {
      user: {
        update: jest.fn().mockResolvedValue({
          ...activeUser,
          explicit_consent_accepted_at: consentDate,
          explicit_consent_version: 'explicit-2026-06',
          kvkk_accepted_at: consentDate,
          kvkk_version: 'kvkk-2026-06',
          privacy_notice_accepted_at: consentDate,
          privacy_notice_version: 'privacy-2026-06'
        })
      }
    };
    const service = new PrivacyService(prisma as never, {} as never);

    const result = await service.acceptConsent('user_1', {
      explicitConsentAccepted: true,
      explicitConsentVersion: 'explicit-2026-06',
      kvkkAccepted: true,
      kvkkVersion: 'kvkk-2026-06',
      privacyNoticeVersion: 'privacy-2026-06'
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'user_1'
        },
        data: expect.objectContaining({
          explicit_consent_version: 'explicit-2026-06',
          kvkk_version: 'kvkk-2026-06',
          privacy_notice_version: 'privacy-2026-06'
        })
      })
    );
    expect(result.kvkkVersion).toBe('kvkk-2026-06');
    expect(result.explicitConsentVersion).toBe('explicit-2026-06');
  });

  it('anonymizes account data and revokes active sessions on deletion', async () => {
    const prisma = {
      $transaction: jest.fn().mockResolvedValue([]),
      attachment: {
        updateMany: jest.fn().mockReturnValue('attachmentUpdate')
      },
      expenseEntry: {
        updateMany: jest.fn().mockReturnValue('expenseUpdate')
      },
      fuelEntry: {
        updateMany: jest.fn().mockReturnValue('fuelUpdate')
      },
      goal: {
        updateMany: jest.fn().mockReturnValue('goalUpdate')
      },
      incomeEntry: {
        updateMany: jest.fn().mockReturnValue('incomeUpdate')
      },
      maintenanceEntry: {
        updateMany: jest.fn().mockReturnValue('maintenanceUpdate')
      },
      notification: {
        updateMany: jest.fn().mockReturnValue('notificationUpdate')
      },
      paymentMethod: {
        updateMany: jest.fn().mockReturnValue('paymentMethodUpdate')
      },
      recurringExpense: {
        updateMany: jest.fn().mockReturnValue('recurringUpdate')
      },
      tagPackage: {
        updateMany: jest.fn().mockReturnValue('packageUpdate')
      },
      trip: {
        updateMany: jest.fn().mockReturnValue('tripUpdate')
      },
      user: {
        findFirst: jest.fn().mockResolvedValue(activeUser),
        update: jest.fn().mockReturnValue('userUpdate')
      },
      userSession: {
        updateMany: jest.fn().mockReturnValue('sessionUpdate')
      },
      vehicle: {
        findMany: jest.fn().mockResolvedValue([{ id: 'vehicle_1' }]),
        update: jest.fn().mockReturnValue('vehicleUpdate')
      }
    };
    const passwordService = {
      hash: jest.fn().mockResolvedValue('anonymized-password-hash')
    };
    const service = new PrivacyService(
      prisma as never,
      passwordService as never
    );

    const result = await service.deleteAccount('user_1', {
      confirmation: 'DELETE_MY_ACCOUNT',
      reason: 'No longer using the service.'
    });

    expect(prisma.vehicle.update).toHaveBeenCalledWith({
      where: {
        id: 'vehicle_1'
      },
      data: expect.objectContaining({
        brand: null,
        is_active: false,
        model: null,
        plate_number: 'DELETED-1-user_1'
      })
    });
    expect(prisma.userSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          revoked_at: expect.any(Date)
        })
      })
    );
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: NotificationStatus.READ
        })
      })
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'deleted-user_1@kvkk.local',
          full_name: null,
          password_hash: 'anonymized-password-hash',
          phone: null
        })
      })
    );
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});

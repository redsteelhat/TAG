import {
  NotificationStatus,
  NotificationType,
  PackageAllocationMethod,
  Prisma,
} from "@prisma/client";
import { ReminderJobsService } from "./reminder-jobs.service";

function createConfig(overrides: Record<string, string | number> = {}) {
  return {
    get: jest.fn((key: string, fallback: string | number) => {
      return overrides[key] ?? fallback;
    }),
  };
}

describe("ReminderJobsService", () => {
  it("creates package ending reminders önce", async () => {
    const prisma = {
      maintenanceEntry: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      notification: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      recurringExpense: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      tagPackage: {
        findMany: jest.fn().mockResolvedValue([
          {
            allocation_method: PackageAllocationMethod.PER_DAY,
            amount: new Prisma.Decimal("700"),
            break_even_target: null,
            created_at: new Date("2026-06-18T00:00:00.000Z"),
            deleted_at: null,
            duration_days: 7,
            ends_at: new Date("2026-06-21T00:00:00.000Z"),
            id: "package_1",
            is_active: true,
            name: "Haftalık TAG paketi",
            note: null,
            starts_at: new Date("2026-06-15T00:00:00.000Z"),
            updated_at: new Date("2026-06-18T00:00:00.000Z"),
            user_id: "user_1",
            vehicle_id: "vehicle_1",
          },
        ]),
      },
    };
    const notifications = {
      createImmediate: jest.fn().mockResolvedValue({}),
      dispatchDueNotifications: jest.fn().mockResolvedValue({
        dispatchedCount: 2,
      }),
    };
    const service = new ReminderJobsService(
      createConfig() as never,
      notifications as never,
      prisma as never,
    );

    const result = await service.runÖnce(new Date("2026-06-19T00:00:00.000Z"));

    expect(notifications.createImmediate).toHaveBeenCalledWith({
      body: "Haftalık TAG paketi paketin 2026-06-21 tarihinde bitiyor.",
      metadata: {
        entityId: "package_1",
        entityType: "tag_package",
        reminderKey: "package-ending:package_1:2026-06-21",
      },
      title: "Paket bitisi yaklaşıyor",
      type: NotificationType.PACKAGE_ENDING,
      userId: "user_1",
    });
    expect(result).toEqual({
      dispatchedDueNotifications: 2,
      maintenanceReminders: 0,
      packageEndingReminders: 1,
      recurringDueReminders: 0,
    });
  });

  it("does not create duplicate reminders with the same reminder key", async () => {
    const prisma = {
      maintenanceEntry: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      notification: {
        findFirst: jest.fn().mockResolvedValue({
          id: "notification_1",
          status: NotificationStatus.SENT,
        }),
      },
      recurringExpense: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      tagPackage: {
        findMany: jest.fn().mockResolvedValue([
          {
            ends_at: new Date("2026-06-21T00:00:00.000Z"),
            id: "package_1",
            name: "Haftalık TAG paketi",
            user_id: "user_1",
          },
        ]),
      },
    };
    const notifications = {
      createImmediate: jest.fn(),
      dispatchDueNotifications: jest.fn().mockResolvedValue({
        dispatchedCount: 0,
      }),
    };
    const service = new ReminderJobsService(
      createConfig() as never,
      notifications as never,
      prisma as never,
    );

    const result = await service.runÖnce(new Date("2026-06-19T00:00:00.000Z"));

    expect(notifications.createImmediate).not.toHaveBeenCalled();
    expect(result.packageEndingReminders).toBe(0);
  });

  it("creates maintenance reminders when vehicle odometer is near due km", async () => {
    const prisma = {
      maintenanceEntry: {
        findMany: jest.fn().mockResolvedValue([
          {
            expected_interval_km: new Prisma.Decimal("10000"),
            id: "maintenance_1",
            odometer_km: new Prisma.Decimal("90000"),
            title: "Periyodik bakım",
            user_id: "user_1",
            vehicle: {
              odometer_km: new Prisma.Decimal("99700"),
            },
          },
        ]),
      },
      notification: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      recurringExpense: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      tagPackage: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const notifications = {
      createImmediate: jest.fn().mockResolvedValue({}),
      dispatchDueNotifications: jest.fn().mockResolvedValue({
        dispatchedCount: 0,
      }),
    };
    const service = new ReminderJobsService(
      createConfig() as never,
      notifications as never,
      prisma as never,
    );

    const result = await service.runÖnce(new Date("2026-06-19T00:00:00.000Z"));

    expect(notifications.createImmediate).toHaveBeenCalledWith({
      body: "Periyodik bakım bakımına 300 km kaldı.",
      metadata: {
        entityId: "maintenance_1",
        entityType: "maintenance_entry",
        reminderKey: "maintenance-km:maintenance_1:100000.0",
      },
      title: "Bakım zamanı yaklaşıyor",
      type: NotificationType.MAINTENANCE_REMINDER,
      userId: "user_1",
    });
    expect(result.maintenanceReminders).toBe(1);
  });
});

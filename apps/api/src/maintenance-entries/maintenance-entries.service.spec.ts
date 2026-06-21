import { AllocationType, Prisma } from "@prisma/client";
import { MaintenanceEntriesService } from "./maintenance-entries.service";

describe("MaintenanceEntriesService", () => {
  it("creates maintenance entry and calculates cost per km", async () => {
    const prisma = {
      vehicle: {
        findFirst: jest.fn().mockResolvedValue({
          annual_estimated_km: new Prisma.Decimal("30000"),
          id: "vehicle_1",
          odometer_km: new Prisma.Decimal("86000"),
        }),
      },
      maintenanceEntry: {
        create: jest.fn().mockResolvedValue({
          id: "maintenance_1",
          user_id: "user_1",
          vehicle_id: "vehicle_1",
          category: "Periyodik bakım",
          title: "Yağ ve filtre",
          amount: new Prisma.Decimal("8000"),
          maintenance_date: new Date("2026-08-18T00:00:00.000Z"),
          odometer_km: new Prisma.Decimal("85000.5"),
          expected_interval_km: new Prisma.Decimal("10000"),
          next_maintenance_km: new Prisma.Decimal("95000.5"),
          estimated_next_date: new Date("2026-12-18T00:00:00.000Z"),
          reminder_enabled: true,
          cost_per_km: new Prisma.Decimal("0.8000"),
          service_name: "Servis",
          allocation_type: AllocationType.PER_KM,
          note: "Not",
          created_at: new Date("2026-08-18T10:00:00.000Z"),
          updated_at: new Date("2026-08-18T10:00:00.000Z"),
        }),
      },
    };
    const service = new MaintenanceEntriesService(prisma as never);

    const result = await service.create("user_1", {
      amount: "8000.00",
      category: "Periyodik bakım",
      expectedIntervalKm: "10000.0",
      maintenanceDate: "2026-08-18",
      note: "Not",
      odometerKm: "85000.5",
      reminderEnabled: true,
      serviceName: "Servis",
      title: "Yağ ve filtre",
      vehicleId: "vehicle_1",
    });

    expect(prisma.maintenanceEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cost_per_km: "0.8000",
          next_maintenance_km: "95000.5",
          reminder_enabled: true,
          vehicle_id: "vehicle_1",
        }),
      }),
    );
    expect(result.costPerKm).toBe("0.8000");
    expect(result.amount).toBe("8000.00");
    expect(result.nextMaintenanceKm).toBe("95000.5");
    expect(result.remainingKm).toBe("9000.5");
    expect(result.reminderEnabled).toBe(true);
  });

  it("lists maintenance entries with pagination metadata", async () => {
    const maintenanceEntry = {
      id: "maintenance_1",
      user_id: "user_1",
      vehicle_id: "vehicle_1",
      category: "Lastik",
      title: "Rot balans",
      amount: new Prisma.Decimal("1000"),
      maintenance_date: new Date("2026-08-18T00:00:00.000Z"),
      odometer_km: null,
      expected_interval_km: null,
      next_maintenance_km: null,
      estimated_next_date: null,
      reminder_enabled: true,
      cost_per_km: null,
      service_name: null,
      allocation_type: AllocationType.IMMEDIATE,
      note: null,
      created_at: new Date("2026-08-18T10:00:00.000Z"),
      updated_at: new Date("2026-08-18T10:00:00.000Z"),
    };
    const prisma = {
      $transaction: jest.fn((queries: Array<Promise<unknown>>) =>
        Promise.all(queries),
      ),
      maintenanceEntry: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([maintenanceEntry]),
      },
    };
    const service = new MaintenanceEntriesService(prisma as never);

    const result = await service.findAll("user_1", {
      category: "Lastik",
      page: 1,
      pageSize: 20,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].category).toBe("Lastik");
    expect(result.meta.total).toBe(1);
    expect(prisma.maintenanceEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: {
            contains: "Lastik",
            mode: "insensitive",
          },
          deleted_at: null,
          user_id: "user_1",
        }),
      }),
    );
  });

  it("soft deletes owned maintenance entry", async () => {
    const prisma = {
      maintenanceEntry: {
        findFirst: jest.fn().mockResolvedValue({
          id: "maintenance_1",
          user_id: "user_1",
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new MaintenanceEntriesService(prisma as never);

    const result = await service.remove("user_1", "maintenance_1");

    expect(result.success).toBe(true);
    expect(prisma.maintenanceEntry.update).toHaveBeenCalledWith({
      where: {
        id: "maintenance_1",
      },
      data: {
        deleted_at: expect.any(Date),
      },
    });
  });
});

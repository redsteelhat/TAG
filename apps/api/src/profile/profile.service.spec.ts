import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  it('maps driver profile decimals to string amounts', () => {
    const service = new ProfileService({} as never);
    const response = (
      service as unknown as {
        toDriverProfileResponse(profile: unknown): {
          dailyTargetNetProfit: string | null;
        };
      }
    ).toDriverProfileResponse({
      id: 'profile_1',
      user_id: 'user_1',
      default_vehicle_id: null,
      fixed_cost_allocation_method: 'CALENDAR_DAY',
      show_depreciation_in_profit: true,
      daily_target_net_profit: { toFixed: () => '1500.00' },
      created_at: new Date('2026-06-17T00:00:00.000Z'),
      updated_at: new Date('2026-06-17T00:00:00.000Z')
    });

    expect(response.dailyTargetNetProfit).toBe('1500.00');
  });
});


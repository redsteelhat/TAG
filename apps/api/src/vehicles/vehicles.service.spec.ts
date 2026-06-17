import { VehiclesService } from './vehicles.service';

describe('VehiclesService', () => {
  it('normalizes plate numbers', () => {
    const service = new VehiclesService({} as never);
    const normalized = (
      service as unknown as {
        normalizePlate(plateNumber: string): string;
      }
    ).normalizePlate('34 abc 123');

    expect(normalized).toBe('34ABC123');
  });
});


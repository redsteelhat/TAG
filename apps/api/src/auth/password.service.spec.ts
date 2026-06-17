import { PasswordService } from './password.service';

describe('PasswordService', () => {
  it('hashes and verifies bcrypt passwords', async () => {
    const service = new PasswordService();
    const hash = await service.hash('StrongPassword123');

    expect(hash).not.toBe('StrongPassword123');
    await expect(service.verify('StrongPassword123', hash)).resolves.toBe(true);
    await expect(service.verify('WrongPassword123', hash)).resolves.toBe(false);
  });
});


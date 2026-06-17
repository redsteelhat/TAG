import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class PasswordService {
  async hash(value: string) {
    return bcrypt.hash(value, BCRYPT_ROUNDS);
  }

  async verify(value: string, hash: string) {
    return bcrypt.compare(value, hash);
  }
}


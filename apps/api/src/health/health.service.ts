import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getHealth() {
    return {
      status: 'ok',
      service: 'tag-api',
      timestamp: new Date().toISOString()
    };
  }
}


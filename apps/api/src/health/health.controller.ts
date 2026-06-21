import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
@ApiTags('Health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Get API health status' })
  getHealth() {
    return this.healthService.getHealth();
  }

  @Get('live')
  @ApiOperation({ summary: 'Get API liveness status' })
  getLiveness() {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Get API readiness status with dependency checks' })
  async getReadiness(@Res({ passthrough: true }) response: Response) {
    const readiness = await this.healthService.getReadiness();

    if (readiness.status !== 'ok') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return readiness;
  }
}

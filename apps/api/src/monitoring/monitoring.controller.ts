import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthService } from '../health/health.service';
import { MonitoringGuard } from './monitoring.guard';

@Controller('monitoring')
@ApiTags('Monitoring')
@SkipThrottle()
@UseGuards(MonitoringGuard)
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'x-monitoring-token',
  required: false,
  description: 'Alternative token for external monitoring systems'
})
export class MonitoringController {
  constructor(private readonly healthService: HealthService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get protected runtime and dependency metrics' })
  async getMetrics() {
    return {
      data: await this.healthService.getRuntimeMetrics()
    };
  }
}

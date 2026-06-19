import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QueueService } from './queue.service';

@UseGuards(JwtAuthGuard)
@Controller('queue')
@ApiTags('Queue')
@ApiBearerAuth('access-token')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get in-process queue statistics' })
  getStats() {
    return {
      data: this.queueService.getStats()
    };
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DailyProfitQueryDto } from './dto/daily-profit-query.dto';
import { WeeklyProfitQueryDto } from './dto/weekly-profit-query.dto';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard)
@Controller('reports')
@ApiTags('Reports')
@ApiBearerAuth('access-token')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-profit')
  @ApiOperation({ summary: 'Calculate daily profit for the current user' })
  async getDailyProfit(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DailyProfitQueryDto
  ) {
    return {
      data: await this.reportsService.calculateDailyProfit(user.id, query)
    };
  }

  @Get('weekly-profit')
  @ApiOperation({ summary: 'Calculate weekly profit for the current user' })
  async getWeeklyProfit(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WeeklyProfitQueryDto
  ) {
    return {
      data: await this.reportsService.calculateWeeklyProfit(user.id, query)
    };
  }
}

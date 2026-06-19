import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BreakEvenQueryDto } from './dto/break-even-query.dto';
import { DailyProfitQueryDto } from './dto/daily-profit-query.dto';
import { HourlyProfitQueryDto } from './dto/hourly-profit-query.dto';
import { KmProfitQueryDto } from './dto/km-profit-query.dto';
import { MonthlyProfitQueryDto } from './dto/monthly-profit-query.dto';
import { ReportOverviewQueryDto } from './dto/report-overview-query.dto';
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

  @Get('monthly-profit')
  @ApiOperation({ summary: 'Calculate monthly profit for the current user' })
  async getMonthlyProfit(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MonthlyProfitQueryDto
  ) {
    return {
      data: await this.reportsService.calculateMonthlyProfit(user.id, query)
    };
  }

  @Get('km-profitability')
  @ApiOperation({ summary: 'Calculate per-kilometer profitability' })
  async getKmProfitability(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: KmProfitQueryDto
  ) {
    return {
      data: await this.reportsService.calculateKmProfitability(user.id, query)
    };
  }

  @Get('hourly-profitability')
  @ApiOperation({ summary: 'Calculate per-hour profitability' })
  async getHourlyProfitability(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: HourlyProfitQueryDto
  ) {
    return {
      data: await this.reportsService.calculateHourlyProfitability(
        user.id,
        query
      )
    };
  }

  @Get('break-even')
  @ApiOperation({ summary: 'Calculate break-even revenue target' })
  async getBreakEven(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: BreakEvenQueryDto
  ) {
    return {
      data: await this.reportsService.calculateBreakEven(user.id, query)
    };
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get report overview for dashboard and reports' })
  async getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportOverviewQueryDto
  ) {
    return {
      data: await this.reportsService.getReportOverview(user.id, query)
    };
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Serialize } from '@main/common/decorators/serialize.decorator';

import { CurrentRestaurant } from '../common/decorators/current-restaurant.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RestaurantOwnerGuard } from '../common/guards/restaurant-owner.guard';
import { DashboardService } from './dashboard.service';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { GetDashboardStatsQueryDto } from './dto/get-dashboard-stats-query.dto';

@ApiTags('Dashboard')
@UseGuards(AuthGuard, RestaurantOwnerGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Serialize(DashboardStatsDto, ['owner'])
  @ApiOkResponse({ type: DashboardStatsDto })
  getStats(@CurrentRestaurant() restaurantId: string, @Query() query: GetDashboardStatsQueryDto) {
    return this.dashboardService.getStats(restaurantId, query.period!);
  }
}

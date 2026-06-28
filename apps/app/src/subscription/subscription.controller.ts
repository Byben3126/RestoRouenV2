import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Serialize } from '@main/common/decorators/serialize.decorator';

import { CurrentRestaurant } from '../common/decorators/current-restaurant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RestaurantOwnerGuard } from '../common/guards/restaurant-owner.guard';
import { CreateCheckoutDto, SubscriptionDto } from './dto';
import { SubscriptionService } from './subscription.service';

@ApiTags('Subscription')
@UseGuards(AuthGuard, RestaurantOwnerGuard)
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @Serialize(SubscriptionDto, ['owner'])
  @ApiOkResponse({ type: SubscriptionDto })
  getSubscription(@CurrentRestaurant() restaurantId: string) {
    return this.subscriptionService.getForRestaurant(restaurantId);
  }

  @Post('portal')
  async createPortalSession(@CurrentUser() userId: string) {
    const url = await this.subscriptionService.createPortalSession(userId);
    return { url };
  }

  @Post('checkout')
  async createCheckout(
    @CurrentUser() userId: string,
    @CurrentRestaurant() restaurantId: string,
    @Body() dto: CreateCheckoutDto,
  ) {
    const url = await this.subscriptionService.createCheckoutSession(
      userId,
      restaurantId,
      dto.plan,
    );
    return { url };
  }
}

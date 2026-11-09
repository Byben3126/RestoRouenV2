import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentRestaurant } from '../common/decorators/current-restaurant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Serialize } from '../common/decorators/serialize.decorator';
import { RestaurantOwnerGuard } from '../common/guards/restaurant-owner.guard';
import { CreateCheckoutDto, SessionUrlDto, SubscriptionDto } from './dto';
import { SubscriptionService } from './subscription.service';

@ApiTags('Subscription')
@UseGuards(RestaurantOwnerGuard)
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
  @ApiCreatedResponse({ type: SessionUrlDto })
  async createPortalSession(@CurrentUser() userId: string) {
    const url = await this.subscriptionService.createPortalSession(userId);
    return { url };
  }

  @Post('checkout')
  @ApiCreatedResponse({ type: SessionUrlDto })
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

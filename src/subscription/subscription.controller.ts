import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  ApiCreatedWrappedResponse,
  ApiOkWrappedResponse,
} from '../common/decorators/api-response.decorator';
import { CurrentRestaurant } from '../common/decorators/current-restaurant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Serialize } from '../common/decorators/serialize.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RestaurantOwnerGuard } from '../common/guards/restaurant-owner.guard';
import { CreateCheckoutDto, SessionUrlDto, SubscriptionDto } from './dto';
import { SubscriptionService } from './subscription.service';

@ApiTags('Subscription')
@UseGuards(AuthGuard, RestaurantOwnerGuard)
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @Serialize(SubscriptionDto, ['owner'])
  @ApiOkWrappedResponse({ type: SubscriptionDto })
  getSubscription(@CurrentRestaurant() restaurantId: string) {
    return this.subscriptionService.getForRestaurant(restaurantId);
  }

  @Post('portal')
  @ApiCreatedWrappedResponse({ type: SessionUrlDto })
  async createPortalSession(@CurrentUser() userId: string) {
    const url = await this.subscriptionService.createPortalSession(userId);
    return { url };
  }

  @Post('checkout')
  @ApiCreatedWrappedResponse({ type: SessionUrlDto })
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

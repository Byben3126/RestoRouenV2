import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Subscription } from './entities/subscription_restaurant.entity';
import { UserCreatedListener } from './listeners/user-created.listener';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Subscription])],
  controllers: [SubscriptionController, WebhookController],
  providers: [SubscriptionService, UserCreatedListener],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}

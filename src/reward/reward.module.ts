import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Reward, RewardUsed } from './entities';
import { OwnerRewardController } from './owner-reward.controller';
import { RestaurantRewardController } from './restaurant-reward.controller';
import { RewardService } from './reward.service';
import { UserRewardController } from './user-reward.controller';

@Module({
  imports: [
    MikroOrmModule.forFeature([Reward, RewardUsed]),
    // Tokens de récupération des récompenses (QR code), valables 10 minutes comme en v1.
    // Secret distinct de celui des promotions : un token de l'un ne passe pas pour l'autre.
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.REWARD_TOKEN_SECRET,
        signOptions: { expiresIn: '10m' },
      }),
    }),
  ],
  controllers: [OwnerRewardController, RestaurantRewardController, UserRewardController],
  providers: [RewardService],
})
export class RewardModule {}

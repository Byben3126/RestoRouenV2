import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Promotion, PromotionTarget, PromotionUsed } from './entities';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';
import { RestaurantPromotionController } from './restaurant-promotion.controller';
import { UserPromotionController } from './user-promotion.controller';

@Module({
  imports: [
    MikroOrmModule.forFeature([Promotion, PromotionTarget, PromotionUsed]),
    // Tokens d'utilisation des promotions (QR code), valables 10 minutes comme en v1
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.PROMOTION_TOKEN_SECRET,
        signOptions: { expiresIn: '10m' },
      }),
    }),
  ],
  controllers: [PromotionController, RestaurantPromotionController, UserPromotionController],
  providers: [PromotionService],
})
export class PromotionModule {}

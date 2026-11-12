import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Outlet } from '../restaurant/entities/outlet.entity';
import { AppUser } from '../user/entities/app-user.entity';
import { Order, PendingPoints } from './entities';
import { HubriseController } from './hubrise.controller';
import { HubriseService } from './hubrise.service';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { UserOrderController } from './user-order.controller';

@Module({
  imports: [
    MikroOrmModule.forFeature([Outlet, Order, PendingPoints, AppUser]),
    // Tokens de récupération des points d'une commande, distincts de ceux des récompenses et promotions
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.ORDER_TOKEN_SECRET,
        signOptions: { expiresIn: '10m' },
      }),
    }),
  ],
  controllers: [HubriseController, OrderController, UserOrderController],
  providers: [HubriseService, OrderService],
})
export class HubriseModule {}

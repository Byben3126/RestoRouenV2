import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Restaurant } from '../restaurant/entities/restaurant.entity';
import { HubriseController } from './hubrise.controller';
import { HubriseService } from './hubrise.service';

@Module({
  imports: [MikroOrmModule.forFeature([Restaurant])],
  controllers: [HubriseController],
  providers: [HubriseService],
})
export class HubriseModule {}

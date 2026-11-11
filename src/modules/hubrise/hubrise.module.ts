import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Outlet } from '../restaurant/entities/outlet.entity';
import { HubriseController } from './hubrise.controller';
import { HubriseService } from './hubrise.service';

@Module({
  imports: [MikroOrmModule.forFeature([Outlet])],
  controllers: [HubriseController],
  providers: [HubriseService],
})
export class HubriseModule {}

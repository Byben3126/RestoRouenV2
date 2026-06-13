import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Customer } from './entities';

@Module({
  imports: [MikroOrmModule.forFeature([Customer])],
})
export class CustomerModule {}

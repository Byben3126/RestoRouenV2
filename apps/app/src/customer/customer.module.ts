import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { Customer } from './entities';
@Module({
  imports: [MikroOrmModule.forFeature([Customer])],
  controllers: [CustomerController],
  providers: [CustomerService],
})
export class CustomerModule {}

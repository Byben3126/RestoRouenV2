import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

import { ClaimPointsByEmailDto } from './dto/claim-points.dto';
import { OrderService } from './order.service';

@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  /** Sans compte connecté : les points vont au compte de cet email, ou l'attendent jusqu'à son inscription */
  @Post('claim')
  @AllowAnonymous()
  claimPointsByEmail(@Body() { token, email }: ClaimPointsByEmailDto) {
    return this.orderService.claimPointsByEmail(token, email);
  }
}

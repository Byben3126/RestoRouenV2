import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ClaimPointsDto } from './dto/claim-points.dto';
import { OrderService } from './order.service';

/** Commandes HubRise de l'utilisateur connecté */
@ApiTags('Orders')
@Controller('users/me/orders')
export class UserOrderController {
  constructor(private readonly orderService: OrderService) {}

  /** Crédite les points de la commande au compte connecté */
  @Post('claim')
  claimPoints(@CurrentUser() userId: string, @Body() { token }: ClaimPointsDto) {
    return this.orderService.claimPoints(token, userId);
  }
}

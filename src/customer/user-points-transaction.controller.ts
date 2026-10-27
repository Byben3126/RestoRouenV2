import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ApiOkWrappedResponse } from '../common/decorators/api-response.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Serialize } from '../common/decorators/serialize.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { CustomerService } from './customer.service';
import { GetPointsTransactionsQueryDto, PointsTransactionPageDto } from './dto';

/** Historique des points de l'utilisateur connecté dans un restaurant */
@ApiTags('Restaurant')
@UseGuards(AuthGuard)
@Controller('users/me/restaurants/:restaurantId/points-transactions')
export class UserPointsTransactionController {
  constructor(private readonly customerService: CustomerService) {}

  /**
   * Du plus récent au plus ancien ; passer nextCursor en `after` pour la page suivante.
   * Vide si l'utilisateur n'a pas de carte dans ce restaurant.
   */
  @Get()
  @Serialize(PointsTransactionPageDto)
  @ApiOkWrappedResponse({ type: PointsTransactionPageDto })
  getPointsTransactions(
    @CurrentUser() userId: string,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Query() query: GetPointsTransactionsQueryDto,
  ) {
    return this.customerService.getUserPointsTransactions(userId, restaurantId, query);
  }
}

import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Serialize } from '../common/decorators/serialize.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import {
  NotificationPreferencesDto,
  RestaurantNotificationSettingDto,
  UpdateNotificationPreferencesDto,
  UpdateRestaurantNotificationSettingDto,
} from './dto/notification-preferences.dto';
import { NotificationPreferencesService } from './notification-preferences.service';

/** Préférences de notifications de l'utilisateur connecté */
@ApiTags('Notifications')
@UseGuards(AuthGuard)
@Controller('users/me/notification-preferences')
export class UserNotificationPreferencesController {
  constructor(private readonly preferencesService: NotificationPreferencesService) {}

  /** Catégories activées ou coupées (points, récompenses, promotions, avis) */
  @Get()
  @Serialize(NotificationPreferencesDto)
  @ApiOkResponse({ type: NotificationPreferencesDto })
  getPreferences(@CurrentUser() userId: string) {
    return this.preferencesService.getPreferences(userId);
  }

  @Patch()
  @Serialize(NotificationPreferencesDto)
  @ApiOkResponse({ type: NotificationPreferencesDto })
  updatePreferences(@CurrentUser() userId: string, @Body() dto: UpdateNotificationPreferencesDto) {
    return this.preferencesService.updatePreferences(userId, dto);
  }

  /** Notifications d'un restaurant activées ou coupées */
  @Get('restaurants/:restaurantId')
  @Serialize(RestaurantNotificationSettingDto)
  @ApiOkResponse({ type: RestaurantNotificationSettingDto })
  getRestaurantSetting(
    @CurrentUser() userId: string,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
  ) {
    return this.preferencesService.getRestaurantSetting(userId, restaurantId);
  }

  /** Active ou coupe toutes les notifications d'un restaurant */
  @Patch('restaurants/:restaurantId')
  @Serialize(RestaurantNotificationSettingDto)
  @ApiOkResponse({ type: RestaurantNotificationSettingDto })
  setRestaurantEnabled(
    @CurrentUser() userId: string,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Body() dto: UpdateRestaurantNotificationSettingDto,
  ) {
    return this.preferencesService.setRestaurantEnabled(userId, restaurantId, dto.enabled);
  }
}

import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Serialize } from '../common/decorators/serialize.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import {
  HasUnreadNotificationsDto,
  NotificationDto,
  NotificationPageDto,
} from './dto/notification.dto';
import { NotificationService } from './notification.service';

/** Centre de notifications de l'utilisateur connecté */
@ApiTags('Notifications')
@UseGuards(AuthGuard)
@Controller('users/me/notifications')
export class UserNotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /** Les plus récentes d'abord ; passer nextCursor en `after` pour la page suivante */
  @Get()
  @Serialize(NotificationPageDto)
  @ApiOkResponse({ type: NotificationPageDto })
  getNotifications(@CurrentUser() userId: string, @Query() query: GetNotificationsQueryDto) {
    return this.notificationService.getNotifications(userId, query);
  }

  /** Au moins une notification non lue : pour la pastille de la cloche */
  @Get('has-unread')
  @Serialize(HasUnreadNotificationsDto)
  @ApiOkResponse({ type: HasUnreadNotificationsDto })
  hasUnread(@CurrentUser() userId: string) {
    return this.notificationService.hasUnread(userId);
  }

  /** À appeler à l'ouverture du centre de notifications */
  @Post('read-all')
  @HttpCode(204)
  @ApiNoContentResponse()
  markAllAsRead(@CurrentUser() userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  @Serialize(NotificationDto)
  @ApiOkResponse({ type: NotificationDto })
  markAsRead(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.notificationService.markAsRead(userId, id);
  }
}

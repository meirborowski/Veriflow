import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationsService.findByUser(user.userId, query);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: JwtPayload) {
    const count = await this.notificationsService.getUnreadCount(user.userId);
    return { count };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAsRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAsRead(id, user.userId);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllAsRead(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAllAsRead(user.userId);
  }
}

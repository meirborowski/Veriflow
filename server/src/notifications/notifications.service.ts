import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationType } from '../common/types/enums';
import type { NotificationQueryDto } from './dto/notification-query.dto';
import type { PaginatedResponse } from '../common/types/pagination';

export interface CreateNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async create(payload: CreateNotificationPayload): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      relatedEntityType: payload.relatedEntityType ?? null,
      relatedEntityId: payload.relatedEntityId ?? null,
    });

    const saved = await this.notificationRepository.save(notification);

    this.logger.log(
      `Notification created: id=${saved.id}, user=${payload.userId}, type=${payload.type}`,
    );

    return saved;
  }

  async findByUser(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<PaginatedResponse<Notification>> {
    const qb = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId });

    if (query.unreadOnly) {
      qb.andWhere('notification.isRead = false');
    }

    const total = await qb.getCount();

    const data = await qb
      .orderBy('notification.createdAt', 'DESC')
      .offset((query.page - 1) * query.limit)
      .limit(query.limit)
      .getMany();

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId, userId },
      { isRead: true },
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }
}

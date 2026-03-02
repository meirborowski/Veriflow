import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { NotificationType } from '../common/types/enums';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockNotificationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and save a notification', async () => {
      const payload = {
        userId: 'user-1',
        type: NotificationType.BUG_ASSIGNED,
        title: 'Bug assigned',
        message: 'You have been assigned a bug',
        relatedEntityType: 'bug',
        relatedEntityId: 'bug-1',
      };

      const created = { ...payload, id: 'notif-1', isRead: false };
      mockNotificationRepository.create.mockReturnValue(created);
      mockNotificationRepository.save.mockResolvedValue(created);

      const result = await service.create(payload);

      expect(mockNotificationRepository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        type: NotificationType.BUG_ASSIGNED,
        title: 'Bug assigned',
        message: 'You have been assigned a bug',
        relatedEntityType: 'bug',
        relatedEntityId: 'bug-1',
      });
      expect(mockNotificationRepository.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });

    it('should default relatedEntityType and relatedEntityId to null', async () => {
      const payload = {
        userId: 'user-1',
        type: NotificationType.MEMBER_ADDED,
        title: 'Added to project',
        message: 'You have been added',
      };

      const created = {
        ...payload,
        relatedEntityType: null,
        relatedEntityId: null,
      };
      mockNotificationRepository.create.mockReturnValue(created);
      mockNotificationRepository.save.mockResolvedValue(created);

      await service.create(payload);

      expect(mockNotificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          relatedEntityType: null,
          relatedEntityId: null,
        }),
      );
    });
  });

  describe('findByUser', () => {
    const setupQueryBuilder = (data: Notification[], total: number) => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(total),
        getMany: jest.fn().mockResolvedValue(data),
      };
      mockNotificationRepository.createQueryBuilder.mockReturnValue(qb);
      return qb;
    };

    it('should return paginated notifications', async () => {
      const notifications = [{ id: 'notif-1' }] as Notification[];
      setupQueryBuilder(notifications, 1);

      const result = await service.findByUser('user-1', { page: 1, limit: 20 });

      expect(result.data).toEqual(notifications);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter by unread only when specified', async () => {
      const qb = setupQueryBuilder([], 0);

      await service.findByUser('user-1', {
        page: 1,
        limit: 20,
        unreadOnly: true,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('notification.isRead = false');
    });

    it('should not filter by unread when not specified', async () => {
      const qb = setupQueryBuilder([], 0);

      await service.findByUser('user-1', { page: 1, limit: 20 });

      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('should update notification isRead to true', async () => {
      mockNotificationRepository.update.mockResolvedValue({ affected: 1 });

      await service.markAsRead('notif-1', 'user-1');

      expect(mockNotificationRepository.update).toHaveBeenCalledWith(
        { id: 'notif-1', userId: 'user-1' },
        { isRead: true },
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread notifications for user', async () => {
      mockNotificationRepository.update.mockResolvedValue({ affected: 5 });

      await service.markAllAsRead('user-1');

      expect(mockNotificationRepository.update).toHaveBeenCalledWith(
        { userId: 'user-1', isRead: false },
        { isRead: true },
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      mockNotificationRepository.count.mockResolvedValue(3);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(3);
      expect(mockNotificationRepository.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });
  });
});

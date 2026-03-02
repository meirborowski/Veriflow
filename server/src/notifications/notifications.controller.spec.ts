import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import type { Notification } from './entities/notification.entity';

describe('NotificationsController', () => {
  let controller: NotificationsController;

  const mockService = {
    findByUser: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
  };

  const mockUser = { userId: 'user-1', email: 'test@example.com' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: mockService }],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated notifications for user', async () => {
      const expected = {
        data: [{ id: 'notif-1' }] as Notification[],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      mockService.findByUser.mockResolvedValue(expected);

      const result = await controller.findAll(mockUser, { page: 1, limit: 20 });

      expect(mockService.findByUser).toHaveBeenCalledWith('user-1', {
        page: 1,
        limit: 20,
      });
      expect(result).toEqual(expected);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockService.getUnreadCount.mockResolvedValue(5);

      const result = await controller.getUnreadCount(mockUser);

      expect(mockService.getUnreadCount).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ count: 5 });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockService.markAsRead.mockResolvedValue(undefined);

      await controller.markAsRead('notif-1', mockUser);

      expect(mockService.markAsRead).toHaveBeenCalledWith('notif-1', 'user-1');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      mockService.markAllAsRead.mockResolvedValue(undefined);

      await controller.markAllAsRead(mockUser);

      expect(mockService.markAllAsRead).toHaveBeenCalledWith('user-1');
    });
  });
});

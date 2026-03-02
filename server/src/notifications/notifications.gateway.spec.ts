import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsGateway } from './notifications.gateway';
import type { Notification } from './entities/notification.entity';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-secret'),
  };

  const createMockSocket = (overrides: Record<string, unknown> = {}) => ({
    id: 'socket-1',
    handshake: { auth: { token: 'valid-token' } },
    data: {},
    disconnect: jest.fn(),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    gateway = module.get<NotificationsGateway>(NotificationsGateway);
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should authenticate and track socket', () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1' });

      const client = createMockSocket();

      gateway.handleConnection(client as never);

      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });
      expect(client.data).toEqual(
        expect.objectContaining({ userId: 'user-1' }),
      );
    });

    it('should disconnect client without token', () => {
      const client = createMockSocket({
        handshake: { auth: {} },
      });

      gateway.handleConnection(client as never);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should disconnect client with invalid token', () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const client = createMockSocket();

      gateway.handleConnection(client as never);

      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should remove socket from tracking', () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1' });

      const client = createMockSocket();

      gateway.handleConnection(client as never);
      gateway.handleDisconnect(client as never);

      // After disconnect, notifyUser should not emit
      const mockServer = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
      gateway.server = mockServer as never;

      gateway.notifyUser('user-1', { id: 'notif-1' } as Notification);
      expect(mockServer.to).not.toHaveBeenCalled();
    });
  });

  describe('notifyUser', () => {
    it('should emit to all user sockets', () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1' });

      const client1 = createMockSocket({ id: 'socket-1' });
      const client2 = createMockSocket({ id: 'socket-2' });

      gateway.handleConnection(client1 as never);
      gateway.handleConnection(client2 as never);

      const mockEmit = jest.fn();
      const mockServer = {
        to: jest.fn().mockReturnValue({ emit: mockEmit }),
      };
      gateway.server = mockServer as never;

      const notification = { id: 'notif-1' } as Notification;
      gateway.notifyUser('user-1', notification);

      expect(mockServer.to).toHaveBeenCalledWith('socket-1');
      expect(mockServer.to).toHaveBeenCalledWith('socket-2');
      expect(mockEmit).toHaveBeenCalledTimes(2);
      expect(mockEmit).toHaveBeenCalledWith('new-notification', notification);
    });

    it('should not emit when user has no sockets', () => {
      const mockServer = { to: jest.fn() };
      gateway.server = mockServer as never;

      gateway.notifyUser('user-unknown', { id: 'notif-1' } as Notification);

      expect(mockServer.to).not.toHaveBeenCalled();
    });
  });
});

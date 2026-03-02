import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import type { Notification } from './entities/notification.entity';

interface SocketData {
  userId: string;
}

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: process.env.CLIENT_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  handleConnection(client: Socket): void {
    try {
      const token = client.handshake.auth.token as string | undefined;
      if (!token) {
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret,
      });

      (client.data as SocketData).userId = payload.sub;

      const userId = payload.sub;
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      this.logger.log(
        `Notification client connected: ${client.id}, user=${userId}`,
      );
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const data = client.data as SocketData;
    if (data.userId) {
      const sockets = this.userSockets.get(data.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(data.userId);
        }
      }
    }

    this.logger.log(`Notification client disconnected: ${client.id}`);
  }

  notifyUser(userId: string, notification: Notification): void {
    const socketIds = this.userSockets.get(userId);
    if (!socketIds || socketIds.size === 0) {
      return;
    }

    for (const socketId of socketIds) {
      this.server.to(socketId).emit('new-notification', notification);
    }
  }
}

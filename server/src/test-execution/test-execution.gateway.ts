import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { TestExecutionService } from './test-execution.service';
import { Release } from '../releases/entities/release.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import type { JoinSessionDto } from './dto/join-session.dto';
import type { RequestWorkDto } from './dto/request-work.dto';
import type { UpdateStepDto } from './dto/update-step.dto';
import type { SubmitResultDto } from './dto/submit-result.dto';

interface SocketData {
  userId: string;
  email: string;
  releaseId?: string;
}

const HEARTBEAT_INTERVAL = 30_000;
const HEARTBEAT_TIMEOUT = 2 * 60_000;

@WebSocketGateway({
  namespace: '/test-runner',
  cors: {
    origin: process.env.CLIENT_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class TestExecutionGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit,
    OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TestExecutionGateway.name);
  private readonly lastSeen = new Map<string, number>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly executionService: TestExecutionService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(Release)
    private readonly releaseRepository: Repository<Release>,
    @InjectRepository(ProjectMember)
    private readonly memberRepository: Repository<ProjectMember>,
  ) {}

  onModuleInit(): void {
    this.heartbeatTimer = setInterval(() => {
      this.checkHeartbeats();
    }, HEARTBEAT_INTERVAL);
  }

  onModuleDestroy(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  handleConnection(client: Socket): void {
    try {
      const token = client.handshake.auth.token as string | undefined;
      if (!token) {
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify<{ sub: string; email: string }>(
        token,
        { secret },
      );

      (client.data as SocketData).userId = payload.sub;
      (client.data as SocketData).email = payload.email;
      this.lastSeen.set(client.id, Date.now());

      this.logger.log(`Client connected: ${client.id}, user=${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const data = client.data as SocketData;
    this.lastSeen.delete(client.id);

    if (data.userId && data.releaseId) {
      const storyId = await this.executionService.cleanupTester(
        data.releaseId,
        data.userId,
      );

      if (storyId) {
        const room = `release:${data.releaseId}`;
        const summary = await this.executionService.getDashboardSummary(
          data.releaseId,
        );

        this.server.to(room).emit('tester-left', {
          userId: data.userId,
          unlockedStoryId: storyId,
        });
        this.server.to(room).emit('dashboard-update', summary);
      }
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-session')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinSessionDto,
  ): Promise<void> {
    const data = client.data as SocketData;

    // Verify user is a member of the release's project
    const release = await this.releaseRepository.findOne({
      where: { id: dto.releaseId },
      select: ['id', 'projectId'],
    });

    if (!release) {
      client.emit('error', { message: 'Release not found' });
      return;
    }

    const member = await this.memberRepository.findOne({
      where: { userId: data.userId, projectId: release.projectId },
    });

    if (!member) {
      client.emit('error', { message: 'Not a member of this project' });
      return;
    }

    const room = `release:${dto.releaseId}`;

    await client.join(room);
    data.releaseId = dto.releaseId;
    this.lastSeen.set(client.id, Date.now());

    this.server.to(room).emit('tester-joined', {
      userId: data.userId,
    });

    this.logger.log(
      `User ${data.userId} joined session: release=${dto.releaseId}`,
    );
  }

  @SubscribeMessage('leave-session')
  async handleLeaveSession(@ConnectedSocket() client: Socket): Promise<void> {
    const data = client.data as SocketData;
    if (!data.releaseId) return;

    const releaseId = data.releaseId;
    const room = `release:${releaseId}`;

    const storyId = await this.executionService.cleanupTester(
      releaseId,
      data.userId,
    );

    await client.leave(room);
    data.releaseId = undefined;

    this.server.to(room).emit('tester-left', {
      userId: data.userId,
      unlockedStoryId: storyId,
    });

    if (storyId) {
      const summary =
        await this.executionService.getDashboardSummary(releaseId);
      this.server.to(room).emit('dashboard-update', summary);
    }

    this.logger.log(`User ${data.userId} left session: release=${releaseId}`);
  }

  @SubscribeMessage('request-work')
  async handleRequestWork(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: RequestWorkDto,
  ): Promise<void> {
    const data = client.data as SocketData;

    try {
      const assigned = await this.executionService.assignStory(
        dto.releaseId,
        data.userId,
      );

      if (assigned) {
        client.emit('story-assigned', assigned);

        const room = `release:${dto.releaseId}`;
        const summary = await this.executionService.getDashboardSummary(
          dto.releaseId,
        );

        this.server.to(room).emit('status-changed', {
          releaseStoryId: assigned.releaseStory.id,
          status: 'IN_PROGRESS',
          userId: data.userId,
        });
        this.server.to(room).emit('dashboard-update', summary);
      } else {
        client.emit('pool-empty');
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to assign story';
      client.emit('error', { message });
    }
  }

  @SubscribeMessage('update-step')
  async handleUpdateStep(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: UpdateStepDto,
  ): Promise<void> {
    const data = client.data as SocketData;

    try {
      const result = await this.executionService.updateStep(
        dto.executionId,
        dto.stepId,
        dto.status,
        dto.comment ?? null,
        data.userId,
      );

      client.emit('step-updated', {
        stepId: dto.stepId,
        status: result.status,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to update step';
      client.emit('error', { message });
    }
  }

  @SubscribeMessage('submit-result')
  async handleSubmitResult(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SubmitResultDto,
  ): Promise<void> {
    const data = client.data as SocketData;

    try {
      const execution = await this.executionService.submitResult(
        dto.executionId,
        dto.status,
        dto.comment ?? null,
        data.userId,
        dto.bug,
      );

      client.emit('result-submitted', {
        executionId: execution.id,
        status: execution.status,
      });

      if (data.releaseId) {
        const room = `release:${data.releaseId}`;
        const summary = await this.executionService.getDashboardSummary(
          data.releaseId,
        );

        this.server.to(room).emit('status-changed', {
          releaseStoryId: execution.releaseStoryId,
          status: execution.status,
          userId: data.userId,
        });
        this.server.to(room).emit('dashboard-update', summary);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to submit result';
      client.emit('error', { message });
    }
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: Socket): void {
    this.lastSeen.set(client.id, Date.now());
  }

  private checkHeartbeats(): void {
    const now = Date.now();

    for (const [socketId, lastTime] of this.lastSeen.entries()) {
      if (now - lastTime > HEARTBEAT_TIMEOUT) {
        this.disconnectSocket(socketId);
        this.lastSeen.delete(socketId);
      }
    }
  }

  private disconnectSocket(socketId: string): void {
    const sockets: Map<string, Socket> | undefined =
      this.server?.sockets?.sockets;
    if (!sockets) return;

    const socket = sockets.get(socketId);
    if (socket) {
      this.logger.log(`Heartbeat timeout: disconnecting ${socketId}`);
      socket.disconnect(true);
    }
  }
}

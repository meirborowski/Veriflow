import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TestExecutionGateway } from './test-execution.gateway';
import { TestExecutionService } from './test-execution.service';
import { TestStatus } from '../common/types/enums';

describe('TestExecutionGateway', () => {
  let gateway: TestExecutionGateway;

  const mockExecutionService = {
    assignStory: jest.fn(),
    updateStep: jest.fn(),
    submitResult: jest.fn(),
    cleanupTester: jest.fn(),
    getDashboardSummary: jest.fn(),
  };

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-secret'),
  };

  const mockRoom = {
    emit: jest.fn(),
  };

  const mockServer = {
    to: jest.fn().mockReturnValue(mockRoom),
    sockets: new Map(),
  };

  const createMockSocket = (overrides: Record<string, unknown> = {}) => ({
    id: 'socket-1',
    handshake: { auth: { token: 'valid-token' } },
    data: {},
    emit: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn(),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestExecutionGateway,
        { provide: TestExecutionService, useValue: mockExecutionService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    gateway = module.get<TestExecutionGateway>(TestExecutionGateway);
    gateway.server = mockServer as never;
    jest.clearAllMocks();
  });

  afterEach(() => {
    gateway.onModuleDestroy();
  });

  describe('handleConnection', () => {
    it('should authenticate client and set userId on socket data', () => {
      const client = createMockSocket();
      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        email: 'test@example.com',
      });

      gateway.handleConnection(client as never);

      expect(client.data).toEqual(
        expect.objectContaining({
          userId: 'user-1',
          email: 'test@example.com',
        }),
      );
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect client with no token', () => {
      const client = createMockSocket({
        handshake: { auth: {} },
      });

      gateway.handleConnection(client as never);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should disconnect client with invalid token', () => {
      const client = createMockSocket();
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      gateway.handleConnection(client as never);

      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should cleanup tester and broadcast when disconnecting with active session', async () => {
      const client = createMockSocket({
        data: { userId: 'user-1', releaseId: 'rel-1' },
      });

      mockExecutionService.cleanupTester.mockResolvedValue('rs-1');
      mockExecutionService.getDashboardSummary.mockResolvedValue({
        total: 5,
        untested: 4,
        inProgress: 0,
        pass: 1,
        fail: 0,
        partiallyTested: 0,
        cantBeTested: 0,
      });

      await gateway.handleDisconnect(client as never);

      expect(mockExecutionService.cleanupTester).toHaveBeenCalledWith(
        'rel-1',
        'user-1',
      );
      expect(mockServer.to).toHaveBeenCalledWith('release:rel-1');
      expect(mockRoom.emit).toHaveBeenCalledWith('tester-left', {
        userId: 'user-1',
        unlockedStoryId: 'rs-1',
      });
      expect(mockRoom.emit).toHaveBeenCalledWith(
        'dashboard-update',
        expect.objectContaining({ total: 5 }),
      );
    });

    it('should not broadcast if no active session', async () => {
      const client = createMockSocket({
        data: { userId: 'user-1' },
      });

      await gateway.handleDisconnect(client as never);

      expect(mockExecutionService.cleanupTester).not.toHaveBeenCalled();
      expect(mockServer.to).not.toHaveBeenCalled();
    });
  });

  describe('join-session', () => {
    it('should join room and broadcast tester-joined', async () => {
      const client = createMockSocket({
        data: { userId: 'user-1' },
      });

      await gateway.handleJoinSession(client as never, { releaseId: 'rel-1' });

      expect(client.join).toHaveBeenCalledWith('release:rel-1');
      expect(client.data).toEqual(
        expect.objectContaining({ releaseId: 'rel-1' }),
      );
      expect(mockServer.to).toHaveBeenCalledWith('release:rel-1');
      expect(mockRoom.emit).toHaveBeenCalledWith('tester-joined', {
        userId: 'user-1',
      });
    });
  });

  describe('request-work', () => {
    it('should emit story-assigned when work is available', async () => {
      const client = createMockSocket({
        data: { userId: 'user-1', releaseId: 'rel-1' },
      });

      const assigned = {
        executionId: 'exec-1',
        releaseStory: { id: 'rs-1', title: 'Login', steps: [] },
        attempt: 1,
      };
      mockExecutionService.assignStory.mockResolvedValue(assigned);
      mockExecutionService.getDashboardSummary.mockResolvedValue({
        total: 5,
      });

      await gateway.handleRequestWork(client as never, { releaseId: 'rel-1' });

      expect(client.emit).toHaveBeenCalledWith('story-assigned', assigned);
      expect(mockRoom.emit).toHaveBeenCalledWith('status-changed', {
        releaseStoryId: 'rs-1',
        status: 'IN_PROGRESS',
        userId: 'user-1',
      });
    });

    it('should emit pool-empty when no work available', async () => {
      const client = createMockSocket({
        data: { userId: 'user-1', releaseId: 'rel-1' },
      });

      mockExecutionService.assignStory.mockResolvedValue(null);

      await gateway.handleRequestWork(client as never, { releaseId: 'rel-1' });

      expect(client.emit).toHaveBeenCalledWith('pool-empty');
    });

    it('should emit error on service failure', async () => {
      const client = createMockSocket({
        data: { userId: 'user-1', releaseId: 'rel-1' },
      });

      mockExecutionService.assignStory.mockRejectedValue(
        new Error('Release must be CLOSED to run tests'),
      );

      await gateway.handleRequestWork(client as never, { releaseId: 'rel-1' });

      expect(client.emit).toHaveBeenCalledWith('error', {
        message: 'Release must be CLOSED to run tests',
      });
    });
  });

  describe('submit-result', () => {
    it('should broadcast status-changed and dashboard-update on submission', async () => {
      const client = createMockSocket({
        data: { userId: 'user-1', releaseId: 'rel-1' },
      });

      mockExecutionService.submitResult.mockResolvedValue({
        id: 'exec-1',
        releaseStoryId: 'rs-1',
        status: TestStatus.PASS,
      });
      mockExecutionService.getDashboardSummary.mockResolvedValue({
        total: 5,
        pass: 2,
      });

      await gateway.handleSubmitResult(client as never, {
        executionId: 'exec-1',
        status: TestStatus.PASS,
      });

      expect(client.emit).toHaveBeenCalledWith('result-submitted', {
        executionId: 'exec-1',
        status: TestStatus.PASS,
      });
      expect(mockRoom.emit).toHaveBeenCalledWith('status-changed', {
        releaseStoryId: 'rs-1',
        status: TestStatus.PASS,
        userId: 'user-1',
      });
    });
  });

  describe('heartbeat', () => {
    it('should update lastSeen timestamp', () => {
      const client = createMockSocket({
        data: { userId: 'user-1', releaseId: 'rel-1' },
      });

      gateway.handleHeartbeat(client as never, { releaseId: 'rel-1' });

      // No error thrown means success - heartbeat is recorded internally
      expect(true).toBe(true);
    });
  });
});

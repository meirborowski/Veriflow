import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TestExecutionService } from './test-execution.service';
import { TestExecution } from './entities/test-execution.entity';
import { StepResult } from './entities/step-result.entity';
import { Release } from '../releases/entities/release.entity';
import { ReleaseStory } from '../releases/entities/release-story.entity';
import { ReleaseStoryStep } from '../releases/entities/release-story-step.entity';
import {
  TestStatus,
  StepStatus,
  ReleaseStatus,
  Priority,
} from '../common/types/enums';

describe('TestExecutionService', () => {
  let service: TestExecutionService;

  const mockExecutionRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockStepResultRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockReleaseRepo = {
    findOne: jest.fn(),
  };

  const mockReleaseStoryRepo = {
    find: jest.fn(),
  };

  const mockReleaseStoryStepRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  // Transaction mocks
  const mockTxExecutionRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
  };

  const mockTxReleaseRepo = {
    findOne: jest.fn(),
  };

  const mockTxStepRepo = {
    find: jest.fn(),
  };

  const mockManager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === TestExecution) return mockTxExecutionRepo;
      if (entity === Release) return mockTxReleaseRepo;
      if (entity === ReleaseStoryStep) return mockTxStepRepo;
      return {};
    }),
    createQueryBuilder: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(
      (cb: (manager: typeof mockManager) => Promise<unknown>) =>
        cb(mockManager),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestExecutionService,
        {
          provide: getRepositoryToken(TestExecution),
          useValue: mockExecutionRepo,
        },
        {
          provide: getRepositoryToken(StepResult),
          useValue: mockStepResultRepo,
        },
        { provide: getRepositoryToken(Release), useValue: mockReleaseRepo },
        {
          provide: getRepositoryToken(ReleaseStory),
          useValue: mockReleaseStoryRepo,
        },
        {
          provide: getRepositoryToken(ReleaseStoryStep),
          useValue: mockReleaseStoryStepRepo,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<TestExecutionService>(TestExecutionService);
    jest.clearAllMocks();

    mockManager.getRepository.mockImplementation((entity: unknown) => {
      if (entity === TestExecution) return mockTxExecutionRepo;
      if (entity === Release) return mockTxReleaseRepo;
      if (entity === ReleaseStoryStep) return mockTxStepRepo;
      return {};
    });
  });

  describe('onModuleInit', () => {
    it('should delete orphaned IN_PROGRESS executions on startup', async () => {
      mockExecutionRepo.delete.mockResolvedValue({ affected: 2 });

      await service.onModuleInit();

      expect(mockExecutionRepo.delete).toHaveBeenCalledWith({
        status: TestStatus.IN_PROGRESS,
        startedAt: expect.objectContaining({}) as unknown,
      });
    });

    it('should handle no orphaned executions gracefully', async () => {
      mockExecutionRepo.delete.mockResolvedValue({ affected: 0 });

      await service.onModuleInit();

      expect(mockExecutionRepo.delete).toHaveBeenCalled();
    });
  });

  describe('assignStory', () => {
    it('should assign the next untested story to a user', async () => {
      const release = { id: 'rel-1', status: ReleaseStatus.CLOSED };
      mockTxReleaseRepo.findOne.mockResolvedValue(release);
      mockTxExecutionRepo.findOne.mockResolvedValue(null);

      const nextStory = {
        id: 'rs-1',
        title: 'Login',
        description: 'Test login',
        priority: Priority.HIGH,
      };

      const mockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(nextStory),
      };
      mockManager.createQueryBuilder.mockReturnValue(mockQb);

      mockTxExecutionRepo.count.mockResolvedValue(0);

      const savedExecution = {
        id: 'exec-1',
        releaseId: 'rel-1',
        releaseStoryId: 'rs-1',
        assignedToUserId: 'user-1',
        attempt: 1,
        status: TestStatus.IN_PROGRESS,
      };
      mockTxExecutionRepo.create.mockReturnValue(savedExecution);
      mockTxExecutionRepo.save.mockResolvedValue(savedExecution);

      const steps = [
        { id: 'step-1', order: 1, instruction: 'Click login' },
        { id: 'step-2', order: 2, instruction: 'Enter password' },
      ];
      mockTxStepRepo.find.mockResolvedValue(steps);

      const result = await service.assignStory('rel-1', 'user-1');

      expect(result).not.toBeNull();
      expect(result!.executionId).toBe('exec-1');
      expect(result!.releaseStory.id).toBe('rs-1');
      expect(result!.releaseStory.steps).toHaveLength(2);
      expect(result!.attempt).toBe(1);
    });

    it('should return null when no stories are available', async () => {
      const release = { id: 'rel-1', status: ReleaseStatus.CLOSED };
      mockTxReleaseRepo.findOne.mockResolvedValue(release);
      mockTxExecutionRepo.findOne.mockResolvedValue(null);

      const mockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockManager.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.assignStory('rel-1', 'user-1');
      expect(result).toBeNull();
    });

    it('should throw NotFoundException if release does not exist', async () => {
      mockTxReleaseRepo.findOne.mockResolvedValue(null);

      await expect(service.assignStory('bad-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if release is not CLOSED', async () => {
      mockTxReleaseRepo.findOne.mockResolvedValue({
        id: 'rel-1',
        status: ReleaseStatus.DRAFT,
      });

      await expect(service.assignStory('rel-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if user already has an in-progress execution', async () => {
      mockTxReleaseRepo.findOne.mockResolvedValue({
        id: 'rel-1',
        status: ReleaseStatus.CLOSED,
      });
      mockTxExecutionRepo.findOne.mockResolvedValue({
        id: 'exec-existing',
        status: TestStatus.IN_PROGRESS,
      });

      await expect(service.assignStory('rel-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should increment attempt number for retested stories', async () => {
      const release = { id: 'rel-1', status: ReleaseStatus.CLOSED };
      mockTxReleaseRepo.findOne.mockResolvedValue(release);
      mockTxExecutionRepo.findOne.mockResolvedValue(null);

      const nextStory = {
        id: 'rs-1',
        title: 'Login',
        description: 'Test login',
        priority: Priority.HIGH,
      };

      const mockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(nextStory),
      };
      mockManager.createQueryBuilder.mockReturnValue(mockQb);

      mockTxExecutionRepo.count.mockResolvedValue(2);

      const savedExecution = {
        id: 'exec-3',
        releaseStoryId: 'rs-1',
        attempt: 3,
        status: TestStatus.IN_PROGRESS,
      };
      mockTxExecutionRepo.create.mockReturnValue(savedExecution);
      mockTxExecutionRepo.save.mockResolvedValue(savedExecution);
      mockTxStepRepo.find.mockResolvedValue([]);

      const result = await service.assignStory('rel-1', 'user-1');

      expect(result!.attempt).toBe(3);
      expect(mockTxExecutionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 3 }),
      );
    });
  });

  describe('updateStep', () => {
    it('should create a new step result', async () => {
      const execution = {
        id: 'exec-1',
        assignedToUserId: 'user-1',
        status: TestStatus.IN_PROGRESS,
        releaseStoryId: 'rs-1',
      };
      mockExecutionRepo.findOne.mockResolvedValue(execution);
      mockReleaseStoryStepRepo.findOne.mockResolvedValue({
        id: 'step-1',
        releaseStoryId: 'rs-1',
      });
      mockStepResultRepo.findOne.mockResolvedValue(null);

      const stepResult = {
        id: 'sr-1',
        executionId: 'exec-1',
        releaseStoryStepId: 'step-1',
        status: StepStatus.PASS,
        comment: null,
      };
      mockStepResultRepo.create.mockReturnValue(stepResult);
      mockStepResultRepo.save.mockResolvedValue(stepResult);

      const result = await service.updateStep(
        'exec-1',
        'step-1',
        StepStatus.PASS,
        null,
        'user-1',
      );

      expect(result.status).toBe(StepStatus.PASS);
      expect(mockStepResultRepo.create).toHaveBeenCalled();
    });

    it('should update an existing step result', async () => {
      const execution = {
        id: 'exec-1',
        assignedToUserId: 'user-1',
        status: TestStatus.IN_PROGRESS,
        releaseStoryId: 'rs-1',
      };
      mockExecutionRepo.findOne.mockResolvedValue(execution);
      mockReleaseStoryStepRepo.findOne.mockResolvedValue({
        id: 'step-1',
        releaseStoryId: 'rs-1',
      });

      const existing = {
        id: 'sr-1',
        executionId: 'exec-1',
        releaseStoryStepId: 'step-1',
        status: StepStatus.PASS,
        comment: null,
      };
      mockStepResultRepo.findOne.mockResolvedValue(existing);
      mockStepResultRepo.save.mockResolvedValue({
        ...existing,
        status: StepStatus.FAIL,
        comment: 'broken',
      });

      const result = await service.updateStep(
        'exec-1',
        'step-1',
        StepStatus.FAIL,
        'broken',
        'user-1',
      );

      expect(result.status).toBe(StepStatus.FAIL);
      expect(result.comment).toBe('broken');
    });

    it('should throw NotFoundException if execution does not exist', async () => {
      mockExecutionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateStep('bad-id', 'step-1', StepStatus.PASS, null, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not the assigned user', async () => {
      mockExecutionRepo.findOne.mockResolvedValue({
        id: 'exec-1',
        assignedToUserId: 'user-2',
        status: TestStatus.IN_PROGRESS,
      });

      await expect(
        service.updateStep('exec-1', 'step-1', StepStatus.PASS, null, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if execution is not in progress', async () => {
      mockExecutionRepo.findOne.mockResolvedValue({
        id: 'exec-1',
        assignedToUserId: 'user-1',
        status: TestStatus.PASS,
      });

      await expect(
        service.updateStep('exec-1', 'step-1', StepStatus.PASS, null, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if step does not belong to the story', async () => {
      mockExecutionRepo.findOne.mockResolvedValue({
        id: 'exec-1',
        assignedToUserId: 'user-1',
        status: TestStatus.IN_PROGRESS,
        releaseStoryId: 'rs-1',
      });
      mockReleaseStoryStepRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateStep(
          'exec-1',
          'bad-step',
          StepStatus.PASS,
          null,
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('submitResult', () => {
    it('should submit a PASS verdict', async () => {
      const execution = {
        id: 'exec-1',
        assignedToUserId: 'user-1',
        status: TestStatus.IN_PROGRESS,
        comment: null,
        completedAt: null,
      };
      mockExecutionRepo.findOne.mockResolvedValue(execution);
      mockExecutionRepo.save.mockResolvedValue({
        ...execution,
        status: TestStatus.PASS,
        completedAt: expect.any(Date) as unknown as Date,
      });

      const result = await service.submitResult(
        'exec-1',
        TestStatus.PASS,
        null,
        'user-1',
      );

      expect(result.status).toBe(TestStatus.PASS);
      expect(result.completedAt).toBeDefined();
    });

    it('should submit a FAIL verdict with comment', async () => {
      const execution = {
        id: 'exec-1',
        assignedToUserId: 'user-1',
        status: TestStatus.IN_PROGRESS,
        comment: null,
        completedAt: null,
      };
      mockExecutionRepo.findOne.mockResolvedValue(execution);
      mockExecutionRepo.save.mockResolvedValue({
        ...execution,
        status: TestStatus.FAIL,
        comment: 'Button broken',
        completedAt: expect.any(Date) as unknown as Date,
      });

      const result = await service.submitResult(
        'exec-1',
        TestStatus.FAIL,
        'Button broken',
        'user-1',
      );

      expect(result.status).toBe(TestStatus.FAIL);
      expect(result.comment).toBe('Button broken');
    });

    it('should throw NotFoundException if execution does not exist', async () => {
      mockExecutionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.submitResult('bad-id', TestStatus.PASS, null, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not the assigned user', async () => {
      mockExecutionRepo.findOne.mockResolvedValue({
        id: 'exec-1',
        assignedToUserId: 'user-2',
        status: TestStatus.IN_PROGRESS,
      });

      await expect(
        service.submitResult('exec-1', TestStatus.PASS, null, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if execution is already completed', async () => {
      mockExecutionRepo.findOne.mockResolvedValue({
        id: 'exec-1',
        assignedToUserId: 'user-1',
        status: TestStatus.PASS,
      });

      await expect(
        service.submitResult('exec-1', TestStatus.FAIL, null, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for invalid final status', async () => {
      mockExecutionRepo.findOne.mockResolvedValue({
        id: 'exec-1',
        assignedToUserId: 'user-1',
        status: TestStatus.IN_PROGRESS,
      });

      await expect(
        service.submitResult('exec-1', TestStatus.IN_PROGRESS, null, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('cleanupTester', () => {
    it('should delete in-progress execution and return story id', async () => {
      const execution = {
        id: 'exec-1',
        releaseStoryId: 'rs-1',
        status: TestStatus.IN_PROGRESS,
      };
      mockExecutionRepo.findOne.mockResolvedValue(execution);
      mockExecutionRepo.remove.mockResolvedValue(execution);

      const result = await service.cleanupTester('rel-1', 'user-1');

      expect(result).toBe('rs-1');
      expect(mockExecutionRepo.remove).toHaveBeenCalledWith(execution);
    });

    it('should return null when no in-progress execution found', async () => {
      mockExecutionRepo.findOne.mockResolvedValue(null);

      const result = await service.cleanupTester('rel-1', 'user-1');

      expect(result).toBeNull();
      expect(mockExecutionRepo.remove).not.toHaveBeenCalled();
    });
  });

  describe('findAllByRelease', () => {
    it('should return paginated execution history', async () => {
      const rawData = [
        {
          id: 'exec-1',
          releaseStoryId: 'rs-1',
          storyTitle: 'Login',
          assignedToUserId: 'user-1',
          testerName: 'John',
          attempt: 1,
          status: TestStatus.PASS,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      ];

      const mockQb = {
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(rawData),
      };

      const mockCountQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      };

      mockExecutionRepo.createQueryBuilder
        .mockReturnValueOnce(mockQb)
        .mockReturnValueOnce(mockCountQb);

      const result = await service.findAllByRelease('rel-1', {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].storyTitle).toBe('Login');
      expect(result.meta.total).toBe(1);
    });

    it('should apply storyId and status filters', async () => {
      const mockQb = {
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      const mockCountQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };

      mockExecutionRepo.createQueryBuilder
        .mockReturnValueOnce(mockQb)
        .mockReturnValueOnce(mockCountQb);

      await service.findAllByRelease('rel-1', {
        page: 1,
        limit: 20,
        storyId: 'rs-1',
        status: TestStatus.PASS,
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'te.releaseStoryId = :storyId',
        { storyId: 'rs-1' },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith('te.status = :status', {
        status: TestStatus.PASS,
      });
    });
  });

  describe('findLatestByRelease', () => {
    it('should return latest status per story with summary', async () => {
      const releaseStories = [
        { id: 'rs-1', title: 'Login', priority: Priority.HIGH },
        { id: 'rs-2', title: 'Register', priority: Priority.MEDIUM },
      ];
      mockReleaseStoryRepo.find.mockResolvedValue(releaseStories);

      const latestExecQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            releaseStoryId: 'rs-1',
            id: 'exec-1',
            status: TestStatus.PASS,
            attempt: 1,
          },
        ]),
      };
      mockExecutionRepo.createQueryBuilder.mockReturnValue(latestExecQb);
      mockExecutionRepo.find.mockResolvedValue([]);

      const result = await service.findLatestByRelease('rel-1');

      expect(result.stories).toHaveLength(2);
      expect(result.stories[0].latestStatus).toBe(TestStatus.PASS);
      expect(result.stories[1].latestStatus).toBe(TestStatus.UNTESTED);
      expect(result.summary.total).toBe(2);
      expect(result.summary.pass).toBe(1);
      expect(result.summary.untested).toBe(1);
    });

    it('should show IN_PROGRESS for stories being tested', async () => {
      const releaseStories = [
        { id: 'rs-1', title: 'Login', priority: Priority.HIGH },
      ];
      mockReleaseStoryRepo.find.mockResolvedValue(releaseStories);

      const latestExecQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      mockExecutionRepo.createQueryBuilder.mockReturnValue(latestExecQb);
      mockExecutionRepo.find.mockResolvedValue([{ releaseStoryId: 'rs-1' }]);

      const result = await service.findLatestByRelease('rel-1');

      expect(result.stories[0].latestStatus).toBe(TestStatus.IN_PROGRESS);
      expect(result.summary.inProgress).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return execution detail with step results', async () => {
      const execution = {
        id: 'exec-1',
        releaseId: 'rel-1',
        releaseStoryId: 'rs-1',
        status: TestStatus.PASS,
        stepResults: [
          { id: 'sr-1', status: StepStatus.PASS },
          { id: 'sr-2', status: StepStatus.FAIL },
        ],
        releaseStory: { title: 'Login' },
        assignedToUser: { name: 'John' },
      };
      mockExecutionRepo.findOne.mockResolvedValue(execution);

      const result = await service.findOne('exec-1');

      expect(result.storyTitle).toBe('Login');
      expect(result.testerName).toBe('John');
      expect(result.stepResults).toHaveLength(2);
    });

    it('should throw NotFoundException if execution does not exist', async () => {
      mockExecutionRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getDashboardSummary', () => {
    it('should return aggregate counts', async () => {
      const releaseStories = [
        { id: 'rs-1', title: 'A', priority: Priority.HIGH },
        { id: 'rs-2', title: 'B', priority: Priority.MEDIUM },
        { id: 'rs-3', title: 'C', priority: Priority.LOW },
      ];
      mockReleaseStoryRepo.find.mockResolvedValue(releaseStories);

      const latestExecQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            releaseStoryId: 'rs-1',
            id: 'exec-1',
            status: TestStatus.PASS,
            attempt: 1,
          },
          {
            releaseStoryId: 'rs-2',
            id: 'exec-2',
            status: TestStatus.FAIL,
            attempt: 1,
          },
        ]),
      };
      mockExecutionRepo.createQueryBuilder.mockReturnValue(latestExecQb);
      mockExecutionRepo.find.mockResolvedValue([]);

      const result = await service.getDashboardSummary('rel-1');

      expect(result.total).toBe(3);
      expect(result.pass).toBe(1);
      expect(result.fail).toBe(1);
      expect(result.untested).toBe(1);
    });
  });
});

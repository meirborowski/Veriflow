import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BugsService } from './bugs.service';
import { Bug } from './entities/bug.entity';
import { UserStory } from '../user-stories/entities/user-story.entity';
import { TestExecution } from '../test-execution/entities/test-execution.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { Release } from '../releases/entities/release.entity';
import { ReleaseStory } from '../releases/entities/release-story.entity';
import { BugSeverity, BugStatus } from '../common/types/enums';

describe('BugsService', () => {
  let service: BugsService;

  const mockExecutionQb = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const mockExecutionRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockExecutionQb),
  };

  const mockReleaseRepo = {
    findOne: jest.fn(),
  };

  const mockBugRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
    manager: {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === TestExecution) return mockExecutionRepo;
        return {};
      }),
    },
  };

  const mockStoryRepo = {
    findOne: jest.fn(),
  };

  const mockMemberRepo = {
    findOne: jest.fn(),
  };

  const mockReleaseStoryRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BugsService,
        { provide: getRepositoryToken(Bug), useValue: mockBugRepo },
        { provide: getRepositoryToken(UserStory), useValue: mockStoryRepo },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: mockMemberRepo,
        },
        {
          provide: getRepositoryToken(ReleaseStory),
          useValue: mockReleaseStoryRepo,
        },
        {
          provide: getRepositoryToken(Release),
          useValue: mockReleaseRepo,
        },
      ],
    }).compile();

    service = module.get<BugsService>(BugsService);
    jest.clearAllMocks();

    mockBugRepo.manager.getRepository.mockImplementation((entity: unknown) => {
      if (entity === TestExecution) return mockExecutionRepo;
      return {};
    });
    mockExecutionRepo.createQueryBuilder.mockReturnValue(mockExecutionQb);
  });

  describe('create', () => {
    it('should create a bug linked to a story', async () => {
      mockStoryRepo.findOne.mockResolvedValue({
        id: 'story-1',
        projectId: 'project-1',
      });

      const bugData = {
        id: 'bug-1',
        projectId: 'project-1',
        storyId: 'story-1',
        executionId: null,
        title: 'Login fails',
        description: 'Button does not work',
        severity: BugSeverity.MAJOR,
        status: BugStatus.OPEN,
        reportedById: 'user-1',
      };

      mockBugRepo.create.mockReturnValue(bugData);
      mockBugRepo.save.mockResolvedValue(bugData);
      mockBugRepo.findOne.mockResolvedValue({
        ...bugData,
        story: { title: 'Login' },
        execution: null,
        reportedBy: { name: 'John' },
        assignedTo: null,
      });

      const result = await service.create('project-1', 'user-1', {
        storyId: 'story-1',
        title: 'Login fails',
        description: 'Button does not work',
        severity: BugSeverity.MAJOR,
      });

      expect(result.id).toBe('bug-1');
      expect(result.status).toBe(BugStatus.OPEN);
      expect(mockBugRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-1',
          storyId: 'story-1',
          reportedById: 'user-1',
        }),
      );
    });

    it('should throw NotFoundException if story not found in project', async () => {
      mockStoryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create('project-1', 'user-1', {
          storyId: 'bad-story',
          title: 'Bug',
          description: 'desc',
          severity: BugSeverity.MINOR,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if execution not found in project', async () => {
      mockStoryRepo.findOne.mockResolvedValue({
        id: 'story-1',
        projectId: 'project-1',
      });
      mockExecutionQb.getOne.mockResolvedValue(null);

      await expect(
        service.create('project-1', 'user-1', {
          storyId: 'story-1',
          executionId: 'bad-exec',
          title: 'Bug',
          description: 'desc',
          severity: BugSeverity.MINOR,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createFromExecution', () => {
    it('should create a bug from a test execution', async () => {
      const execution = {
        id: 'exec-1',
        releaseStoryId: 'rs-1',
        releaseId: 'rel-1',
      } as TestExecution;

      mockReleaseStoryRepo.findOne.mockResolvedValue({
        id: 'rs-1',
        sourceStoryId: 'story-1',
        releaseId: 'rel-1',
      });

      mockReleaseRepo.findOne.mockResolvedValue({
        id: 'rel-1',
        projectId: 'project-1',
      });

      const bugData = {
        id: 'bug-1',
        projectId: 'project-1',
        storyId: 'story-1',
        executionId: 'exec-1',
        title: 'Bug title',
        description: 'Bug desc',
        severity: BugSeverity.CRITICAL,
        status: BugStatus.OPEN,
        reportedById: 'user-1',
      };

      mockBugRepo.create.mockReturnValue(bugData);
      mockBugRepo.save.mockResolvedValue(bugData);

      const result = await service.createFromExecution(execution, 'user-1', {
        title: 'Bug title',
        description: 'Bug desc',
        severity: BugSeverity.CRITICAL,
      });

      expect(result.id).toBe('bug-1');
      expect(result.storyId).toBe('story-1');
      expect(result.executionId).toBe('exec-1');
    });

    it('should throw NotFoundException if release story not found', async () => {
      mockReleaseStoryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createFromExecution(
          { id: 'exec-1', releaseStoryId: 'bad-rs' } as TestExecution,
          'user-1',
          {
            title: 'Bug',
            description: 'desc',
            severity: BugSeverity.MINOR,
          },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if source story was deleted', async () => {
      mockReleaseStoryRepo.findOne.mockResolvedValue({
        id: 'rs-1',
        sourceStoryId: null,
        releaseId: 'rel-1',
      });

      mockReleaseRepo.findOne.mockResolvedValue({
        id: 'rel-1',
        projectId: 'project-1',
      });

      await expect(
        service.createFromExecution(
          { id: 'exec-1', releaseStoryId: 'rs-1' } as TestExecution,
          'user-1',
          {
            title: 'Bug',
            description: 'desc',
            severity: BugSeverity.MINOR,
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllByProject', () => {
    it('should return paginated bug list', async () => {
      const rawData = [
        {
          id: 'bug-1',
          title: 'Login fails',
          severity: BugSeverity.MAJOR,
          status: BugStatus.OPEN,
          storyTitle: 'Login',
          reportedByName: 'John',
          assignedToName: null,
          createdAt: new Date(),
        },
      ];

      const mockQb = {
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
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

      mockBugRepo.createQueryBuilder
        .mockReturnValueOnce(mockQb)
        .mockReturnValueOnce(mockCountQb);

      const result = await service.findAllByProject('project-1', {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Login fails');
      expect(result.meta.total).toBe(1);
    });

    it('should apply status and severity filters', async () => {
      const mockQb = {
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
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

      mockBugRepo.createQueryBuilder
        .mockReturnValueOnce(mockQb)
        .mockReturnValueOnce(mockCountQb);

      await service.findAllByProject('project-1', {
        page: 1,
        limit: 20,
        status: BugStatus.OPEN,
        severity: BugSeverity.CRITICAL,
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith('bug.status = :status', {
        status: BugStatus.OPEN,
      });
      expect(mockQb.andWhere).toHaveBeenCalledWith('bug.severity = :severity', {
        severity: BugSeverity.CRITICAL,
      });
    });
  });

  describe('findOne', () => {
    it('should return bug with relations', async () => {
      const bug = {
        id: 'bug-1',
        title: 'Login fails',
        story: { title: 'Login' },
        execution: null,
        reportedBy: { name: 'John' },
        assignedTo: null,
      };

      mockBugRepo.findOne.mockResolvedValue(bug);

      const result = await service.findOne('bug-1');

      expect(result.id).toBe('bug-1');
      expect(mockBugRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'bug-1' },
        relations: ['story', 'execution', 'reportedBy', 'assignedTo'],
      });
    });

    it('should throw NotFoundException if bug not found', async () => {
      mockBugRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update bug status', async () => {
      const bug = {
        id: 'bug-1',
        projectId: 'project-1',
        status: BugStatus.OPEN,
      };

      mockBugRepo.findOne.mockResolvedValueOnce(bug).mockResolvedValueOnce({
        ...bug,
        status: BugStatus.IN_PROGRESS,
        story: { title: 'Login' },
        execution: null,
        reportedBy: { name: 'John' },
        assignedTo: null,
      });
      mockBugRepo.save.mockResolvedValue({
        ...bug,
        status: BugStatus.IN_PROGRESS,
      });

      const result = await service.update('bug-1', {
        status: BugStatus.IN_PROGRESS,
      });

      expect(result.status).toBe(BugStatus.IN_PROGRESS);
    });

    it('should validate assignee is a project member', async () => {
      mockBugRepo.findOne.mockResolvedValue({
        id: 'bug-1',
        projectId: 'project-1',
      });
      mockMemberRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('bug-1', { assignedToId: 'bad-user' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if bug not found', async () => {
      mockBugRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('bad-id', { status: BugStatus.CLOSED }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow setting assignedToId to null', async () => {
      const bug = {
        id: 'bug-1',
        projectId: 'project-1',
        assignedToId: 'user-1',
      };

      mockBugRepo.findOne.mockResolvedValueOnce(bug).mockResolvedValueOnce({
        ...bug,
        assignedToId: null,
        story: { title: 'Login' },
        execution: null,
        reportedBy: { name: 'John' },
        assignedTo: null,
      });
      mockBugRepo.save.mockResolvedValue({ ...bug, assignedToId: null });

      const result = await service.update('bug-1', { assignedToId: null });

      expect(result.assignedTo).toBeNull();
    });
  });

  describe('remove', () => {
    it('should delete a bug', async () => {
      const bug = { id: 'bug-1' };
      mockBugRepo.findOne.mockResolvedValue(bug);
      mockBugRepo.remove.mockResolvedValue(bug);

      await service.remove('bug-1');

      expect(mockBugRepo.remove).toHaveBeenCalledWith(bug);
    });

    it('should throw NotFoundException if bug not found', async () => {
      mockBugRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReleasesService } from './releases.service';
import { Release } from './entities/release.entity';
import { ReleaseStory } from './entities/release-story.entity';
import { ReleaseStoryStep } from './entities/release-story-step.entity';
import { UserStory } from '../user-stories/entities/user-story.entity';
import { ReleaseStatus, Priority, StoryStatus } from '../common/types/enums';

describe('ReleasesService', () => {
  let service: ReleasesService;

  const mockReleaseRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockReleaseStoryRepo = {
    find: jest.fn(),
  };

  const mockStoryRepo = {
    find: jest.fn(),
  };

  const mockReleaseStoryRepoTx = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockReleaseStepRepoTx = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockReleaseRepoTx = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockManager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === ReleaseStory) return mockReleaseStoryRepoTx;
      if (entity === ReleaseStoryStep) return mockReleaseStepRepoTx;
      if (entity === Release) return mockReleaseRepoTx;
      return {};
    }),
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
        ReleasesService,
        { provide: getRepositoryToken(Release), useValue: mockReleaseRepo },
        {
          provide: getRepositoryToken(ReleaseStory),
          useValue: mockReleaseStoryRepo,
        },
        { provide: getRepositoryToken(UserStory), useValue: mockStoryRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ReleasesService>(ReleasesService);
    jest.clearAllMocks();

    mockManager.getRepository.mockImplementation((entity: unknown) => {
      if (entity === ReleaseStory) return mockReleaseStoryRepoTx;
      if (entity === ReleaseStoryStep) return mockReleaseStepRepoTx;
      if (entity === Release) return mockReleaseRepoTx;
      return {};
    });
  });

  describe('create', () => {
    it('should create a release with DRAFT status', async () => {
      const dto = { name: 'v1.0' };
      const saved = {
        id: 'release-1',
        projectId: 'proj-1',
        name: 'v1.0',
        status: ReleaseStatus.DRAFT,
        createdAt: new Date(),
        closedAt: null,
      };

      mockReleaseRepo.create.mockReturnValue(saved);
      mockReleaseRepo.save.mockResolvedValue(saved);

      const result = await service.create('proj-1', dto);
      expect(result.id).toBe('release-1');
      expect(result.status).toBe(ReleaseStatus.DRAFT);
      expect(result.closedAt).toBeNull();
      expect(mockReleaseRepo.create).toHaveBeenCalledWith({
        projectId: 'proj-1',
        name: 'v1.0',
      });
    });
  });

  describe('findAllByProject', () => {
    it('should return paginated releases with story counts', async () => {
      const rawData = [
        {
          id: 'release-1',
          name: 'v1.0',
          status: ReleaseStatus.DRAFT,
          createdAt: new Date(),
          closedAt: null,
          storyCount: 3,
        },
      ];

      const mockQb = {
        select: jest.fn().mockReturnThis(),
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

      mockReleaseRepo.createQueryBuilder
        .mockReturnValueOnce(mockQb)
        .mockReturnValueOnce(mockCountQb);

      const result = await service.findAllByProject('proj-1', {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].storyCount).toBe(3);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should apply status filter', async () => {
      const mockQb = {
        select: jest.fn().mockReturnThis(),
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

      mockReleaseRepo.createQueryBuilder
        .mockReturnValueOnce(mockQb)
        .mockReturnValueOnce(mockCountQb);

      await service.findAllByProject('proj-1', {
        page: 1,
        limit: 20,
        status: ReleaseStatus.DRAFT,
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith('release.status = :status', {
        status: ReleaseStatus.DRAFT,
      });
    });

    it('should return empty data when no releases exist', async () => {
      const mockQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      const mockCountQb = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };

      mockReleaseRepo.createQueryBuilder
        .mockReturnValueOnce(mockQb)
        .mockReturnValueOnce(mockCountQb);

      const result = await service.findAllByProject('proj-1', {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return draft release with scoped stories', async () => {
      const release = {
        id: 'release-1',
        projectId: 'proj-1',
        name: 'v1.0',
        status: ReleaseStatus.DRAFT,
        createdAt: new Date(),
        closedAt: null,
      };

      const releaseWithScoped = {
        ...release,
        scopedStories: [
          {
            id: 'story-1',
            title: 'Login',
            priority: Priority.HIGH,
            status: StoryStatus.ACTIVE,
            steps: [{ id: 'step-1', order: 1, instruction: 'Click login' }],
          },
        ],
      };

      mockReleaseRepo.findOne
        .mockResolvedValueOnce(release)
        .mockResolvedValueOnce(releaseWithScoped);

      const result = await service.findOne('release-1');
      expect(result.status).toBe(ReleaseStatus.DRAFT);
      expect(result.stories).toHaveLength(1);
      expect((result.stories as Record<string, unknown>[])[0]).toEqual({
        id: 'story-1',
        title: 'Login',
        priority: Priority.HIGH,
        status: StoryStatus.ACTIVE,
        stepCount: 1,
      });
    });

    it('should return closed release with snapshot stories', async () => {
      const release = {
        id: 'release-1',
        projectId: 'proj-1',
        name: 'v1.0',
        status: ReleaseStatus.CLOSED,
        createdAt: new Date(),
        closedAt: new Date(),
      };

      const snapshotStories = [
        {
          id: 'rs-1',
          sourceStoryId: 'story-1',
          title: 'Login',
          description: 'Test login',
          priority: Priority.HIGH,
          steps: [{ id: 'rss-1', order: 1, instruction: 'Click login' }],
        },
      ];

      mockReleaseRepo.findOne.mockResolvedValue(release);
      mockReleaseStoryRepo.find.mockResolvedValue(snapshotStories);

      const result = await service.findOne('release-1');
      expect(result.status).toBe(ReleaseStatus.CLOSED);
      expect(result.stories).toHaveLength(1);
      expect((result.stories as Record<string, unknown>[])[0]).toEqual({
        id: 'rs-1',
        sourceStoryId: 'story-1',
        title: 'Login',
        description: 'Test login',
        priority: Priority.HIGH,
        steps: snapshotStories[0].steps,
      });
    });

    it('should throw NotFoundException when release does not exist', async () => {
      mockReleaseRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update release name when draft', async () => {
      const release = {
        id: 'release-1',
        name: 'v1.0',
        status: ReleaseStatus.DRAFT,
      };
      const updated = { ...release, name: 'v1.1' };

      mockReleaseRepo.findOne.mockResolvedValue(release);
      mockReleaseRepo.save.mockResolvedValue(updated);

      const result = await service.update('release-1', { name: 'v1.1' });
      expect(result.name).toBe('v1.1');
      expect(mockReleaseRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when release does not exist', async () => {
      mockReleaseRepo.findOne.mockResolvedValue(null);
      await expect(service.update('bad-id', { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when release is closed', async () => {
      const release = {
        id: 'release-1',
        name: 'v1.0',
        status: ReleaseStatus.CLOSED,
      };
      mockReleaseRepo.findOne.mockResolvedValue(release);

      await expect(
        service.update('release-1', { name: 'New' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete a draft release', async () => {
      const release = {
        id: 'release-1',
        status: ReleaseStatus.DRAFT,
      };
      mockReleaseRepo.findOne.mockResolvedValue(release);
      mockReleaseRepo.remove.mockResolvedValue(release);

      await service.remove('release-1');
      expect(mockReleaseRepo.remove).toHaveBeenCalledWith(release);
    });

    it('should throw NotFoundException when release does not exist', async () => {
      mockReleaseRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when release is closed', async () => {
      const release = {
        id: 'release-1',
        status: ReleaseStatus.CLOSED,
      };
      mockReleaseRepo.findOne.mockResolvedValue(release);

      await expect(service.remove('release-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('close', () => {
    it('should create snapshots and close the release', async () => {
      const release = {
        id: 'release-1',
        projectId: 'proj-1',
        name: 'v1.0',
        status: ReleaseStatus.DRAFT,
        scopedStories: [
          {
            id: 'story-1',
            title: 'Login',
            description: 'Test login flow',
            priority: Priority.HIGH,
            steps: [
              { id: 'step-1', order: 1, instruction: 'Click login' },
              { id: 'step-2', order: 2, instruction: 'Enter credentials' },
            ],
          },
          {
            id: 'story-2',
            title: 'Register',
            description: 'Test register flow',
            priority: Priority.MEDIUM,
            steps: [{ id: 'step-3', order: 1, instruction: 'Click register' }],
          },
        ],
      };

      mockReleaseRepoTx.findOne.mockResolvedValue(release);

      const savedSnapshot1 = { id: 'rs-1', releaseId: 'release-1' };
      const savedSnapshot2 = { id: 'rs-2', releaseId: 'release-1' };
      mockReleaseStoryRepoTx.create.mockImplementation(
        (data: Record<string, unknown>) => data,
      );
      mockReleaseStoryRepoTx.save
        .mockResolvedValueOnce(savedSnapshot1)
        .mockResolvedValueOnce(savedSnapshot2);
      mockReleaseStepRepoTx.create.mockImplementation(
        (data: Record<string, unknown>) => data,
      );
      mockReleaseStepRepoTx.save.mockResolvedValue([]);
      mockReleaseRepoTx.update.mockResolvedValue({});

      const result = await service.close('release-1');

      expect(result.status).toBe(ReleaseStatus.CLOSED);
      expect(result.storyCount).toBe(2);
      expect(result.closedAt).toBeInstanceOf(Date);
      expect(mockDataSource.transaction).toHaveBeenCalled();

      // Verify snapshots were created with correct data
      expect(mockReleaseStoryRepoTx.create).toHaveBeenCalledWith({
        releaseId: 'release-1',
        sourceStoryId: 'story-1',
        title: 'Login',
        description: 'Test login flow',
        priority: Priority.HIGH,
      });
      expect(mockReleaseStoryRepoTx.create).toHaveBeenCalledWith({
        releaseId: 'release-1',
        sourceStoryId: 'story-2',
        title: 'Register',
        description: 'Test register flow',
        priority: Priority.MEDIUM,
      });

      // Verify steps were copied
      expect(mockReleaseStepRepoTx.create).toHaveBeenCalledTimes(3);
      expect(mockReleaseStepRepoTx.create).toHaveBeenCalledWith({
        releaseStoryId: 'rs-1',
        order: 1,
        instruction: 'Click login',
      });
      expect(mockReleaseStepRepoTx.create).toHaveBeenCalledWith({
        releaseStoryId: 'rs-1',
        order: 2,
        instruction: 'Enter credentials',
      });
      expect(mockReleaseStepRepoTx.create).toHaveBeenCalledWith({
        releaseStoryId: 'rs-2',
        order: 1,
        instruction: 'Click register',
      });

      // Verify release status was updated
      expect(mockReleaseRepoTx.update).toHaveBeenCalledWith('release-1', {
        status: ReleaseStatus.CLOSED,
        closedAt: expect.any(Date) as unknown as Date,
      });
    });

    it('should throw BadRequestException when scope is empty', async () => {
      const release = {
        id: 'release-1',
        projectId: 'proj-1',
        status: ReleaseStatus.DRAFT,
        scopedStories: [],
      };

      mockReleaseRepoTx.findOne.mockResolvedValue(release);

      await expect(service.close('release-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException when release is already closed', async () => {
      const release = {
        id: 'release-1',
        status: ReleaseStatus.CLOSED,
        scopedStories: [{ id: 'story-1' }],
      };

      mockReleaseRepoTx.findOne.mockResolvedValue(release);

      await expect(service.close('release-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException when release does not exist', async () => {
      mockReleaseRepoTx.findOne.mockResolvedValue(null);

      await expect(service.close('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addStories', () => {
    const mockRelationQb = {
      relation: jest.fn().mockReturnThis(),
      of: jest.fn().mockReturnThis(),
      add: jest.fn().mockResolvedValue(undefined),
    };

    it('should add stories to a draft release', async () => {
      const release = {
        id: 'release-1',
        projectId: 'proj-1',
        status: ReleaseStatus.DRAFT,
        scopedStories: [],
      };

      mockReleaseRepo.findOne.mockResolvedValue(release);
      mockStoryRepo.find.mockResolvedValue([
        { id: 'story-1', projectId: 'proj-1' },
        { id: 'story-2', projectId: 'proj-1' },
      ]);
      mockReleaseRepo.createQueryBuilder.mockReturnValue(mockRelationQb);

      const result = await service.addStories('release-1', {
        storyIds: ['story-1', 'story-2'],
      });

      expect(result.added).toBe(2);
      expect(mockRelationQb.add).toHaveBeenCalledWith(['story-1', 'story-2']);
    });

    it('should skip already-scoped stories', async () => {
      const release = {
        id: 'release-1',
        projectId: 'proj-1',
        status: ReleaseStatus.DRAFT,
        scopedStories: [{ id: 'story-1' }],
      };

      mockReleaseRepo.findOne.mockResolvedValue(release);
      mockStoryRepo.find.mockResolvedValue([
        { id: 'story-1', projectId: 'proj-1' },
        { id: 'story-2', projectId: 'proj-1' },
      ]);
      mockReleaseRepo.createQueryBuilder.mockReturnValue(mockRelationQb);

      const result = await service.addStories('release-1', {
        storyIds: ['story-1', 'story-2'],
      });

      expect(result.added).toBe(1);
      expect(mockRelationQb.add).toHaveBeenCalledWith(['story-2']);
    });

    it('should throw BadRequestException for cross-project stories', async () => {
      const release = {
        id: 'release-1',
        projectId: 'proj-1',
        status: ReleaseStatus.DRAFT,
        scopedStories: [],
      };

      mockReleaseRepo.findOne.mockResolvedValue(release);
      mockStoryRepo.find.mockResolvedValue([
        { id: 'story-1', projectId: 'proj-2' },
      ]);

      await expect(
        service.addStories('release-1', { storyIds: ['story-1'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when stories not found', async () => {
      const release = {
        id: 'release-1',
        projectId: 'proj-1',
        status: ReleaseStatus.DRAFT,
        scopedStories: [],
      };

      mockReleaseRepo.findOne.mockResolvedValue(release);
      mockStoryRepo.find.mockResolvedValue([]);

      await expect(
        service.addStories('release-1', { storyIds: ['story-1'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when release is closed', async () => {
      const release = {
        id: 'release-1',
        projectId: 'proj-1',
        status: ReleaseStatus.CLOSED,
        scopedStories: [],
      };

      mockReleaseRepo.findOne.mockResolvedValue(release);

      await expect(
        service.addStories('release-1', { storyIds: ['story-1'] }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when release does not exist', async () => {
      mockReleaseRepo.findOne.mockResolvedValue(null);

      await expect(
        service.addStories('bad-id', { storyIds: ['story-1'] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeStory', () => {
    const mockRelationQb = {
      relation: jest.fn().mockReturnThis(),
      of: jest.fn().mockReturnThis(),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    it('should remove a scoped story from a draft release', async () => {
      const release = {
        id: 'release-1',
        status: ReleaseStatus.DRAFT,
        scopedStories: [{ id: 'story-1' }],
      };

      mockReleaseRepo.findOne.mockResolvedValue(release);
      mockReleaseRepo.createQueryBuilder.mockReturnValue(mockRelationQb);

      await service.removeStory('release-1', 'story-1');
      expect(mockRelationQb.remove).toHaveBeenCalledWith('story-1');
    });

    it('should throw NotFoundException when story is not in scope', async () => {
      const release = {
        id: 'release-1',
        status: ReleaseStatus.DRAFT,
        scopedStories: [],
      };

      mockReleaseRepo.findOne.mockResolvedValue(release);

      await expect(service.removeStory('release-1', 'story-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when release is closed', async () => {
      const release = {
        id: 'release-1',
        status: ReleaseStatus.CLOSED,
        scopedStories: [{ id: 'story-1' }],
      };

      mockReleaseRepo.findOne.mockResolvedValue(release);

      await expect(service.removeStory('release-1', 'story-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException when release does not exist', async () => {
      mockReleaseRepo.findOne.mockResolvedValue(null);

      await expect(service.removeStory('bad-id', 'story-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

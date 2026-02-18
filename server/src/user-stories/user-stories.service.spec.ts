import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UserStoriesService } from './user-stories.service';
import { UserStory } from './entities/user-story.entity';
import { VerificationStep } from './entities/verification-step.entity';
import { Priority, StoryStatus } from '../common/types/enums';

describe('UserStoriesService', () => {
  let service: UserStoriesService;

  const mockStoryRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockStepRepo = {
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserStoriesService,
        { provide: getRepositoryToken(UserStory), useValue: mockStoryRepo },
        {
          provide: getRepositoryToken(VerificationStep),
          useValue: mockStepRepo,
        },
      ],
    }).compile();

    service = module.get<UserStoriesService>(UserStoriesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a story with steps and return it', async () => {
      const dto = {
        title: 'Login flow',
        description: 'Test login',
        priority: Priority.HIGH,
        steps: [{ order: 1, instruction: 'Click login' }],
      };

      const savedStory = { id: 'story-1', projectId: 'proj-1', ...dto };
      mockStoryRepo.create.mockReturnValue(savedStory);
      mockStoryRepo.save.mockResolvedValue(savedStory);

      const step = {
        id: 'step-1',
        storyId: 'story-1',
        order: 1,
        instruction: 'Click login',
      };
      mockStepRepo.create.mockReturnValue(step);
      mockStepRepo.save.mockResolvedValue([step]);

      // findOne called after creation
      const storyWithSteps = { ...savedStory, steps: [step] };
      mockStoryRepo.findOne.mockResolvedValue(storyWithSteps);

      const result = await service.create('proj-1', dto);
      expect(result.id).toBe('story-1');
      expect(result.steps).toHaveLength(1);
      expect(mockStoryRepo.save).toHaveBeenCalled();
      expect(mockStepRepo.save).toHaveBeenCalled();
    });

    it('should create multiple steps', async () => {
      const dto = {
        title: 'Multi step',
        description: 'Desc',
        priority: Priority.MEDIUM,
        steps: [
          { order: 1, instruction: 'Step 1' },
          { order: 2, instruction: 'Step 2' },
        ],
      };

      const savedStory = { id: 'story-2', projectId: 'proj-1' };
      mockStoryRepo.create.mockReturnValue(savedStory);
      mockStoryRepo.save.mockResolvedValue(savedStory);
      mockStepRepo.create.mockImplementation((s: Record<string, unknown>) => s);
      mockStepRepo.save.mockResolvedValue([]);

      const storyWithSteps = {
        ...savedStory,
        steps: [
          { id: 's1', order: 1, instruction: 'Step 1' },
          { id: 's2', order: 2, instruction: 'Step 2' },
        ],
      };
      mockStoryRepo.findOne.mockResolvedValue(storyWithSteps);

      const result = await service.create('proj-1', dto);
      expect(mockStepRepo.create).toHaveBeenCalledTimes(2);
      expect(result.steps).toHaveLength(2);
    });
  });

  describe('findAllByProject', () => {
    it('should return paginated stories with step counts', async () => {
      const rawData = [
        {
          id: 'story-1',
          title: 'S1',
          description: 'D1',
          priority: Priority.HIGH,
          status: StoryStatus.DRAFT,
          createdAt: new Date(),
          updatedAt: new Date(),
          stepCount: 3,
        },
      ];

      const mockQb = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
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

      mockStoryRepo.createQueryBuilder
        .mockReturnValueOnce(mockQb)
        .mockReturnValueOnce(mockCountQb);

      const result = await service.findAllByProject('proj-1', {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].stepCount).toBe(3);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should apply status filter', async () => {
      const mockQb = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
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

      mockStoryRepo.createQueryBuilder
        .mockReturnValueOnce(mockQb)
        .mockReturnValueOnce(mockCountQb);

      await service.findAllByProject('proj-1', {
        page: 1,
        limit: 20,
        status: StoryStatus.ACTIVE,
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith('story.status = :status', {
        status: StoryStatus.ACTIVE,
      });
    });

    it('should apply priority filter', async () => {
      const mockQb = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
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

      mockStoryRepo.createQueryBuilder
        .mockReturnValueOnce(mockQb)
        .mockReturnValueOnce(mockCountQb);

      await service.findAllByProject('proj-1', {
        page: 1,
        limit: 20,
        priority: Priority.CRITICAL,
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'story.priority = :priority',
        { priority: Priority.CRITICAL },
      );
    });

    it('should apply search filter', async () => {
      const mockQb = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
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

      mockStoryRepo.createQueryBuilder
        .mockReturnValueOnce(mockQb)
        .mockReturnValueOnce(mockCountQb);

      await service.findAllByProject('proj-1', {
        page: 1,
        limit: 20,
        search: 'login',
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        '(story.title ILIKE :search OR story.description ILIKE :search)',
        { search: '%login%' },
      );
    });

    it('should return empty data when no stories exist', async () => {
      const mockQb = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      const mockCountQb = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };

      mockStoryRepo.createQueryBuilder
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
    it('should return story with steps ordered by order', async () => {
      const story = {
        id: 'story-1',
        title: 'S1',
        steps: [
          { id: 's1', order: 1, instruction: 'First' },
          { id: 's2', order: 2, instruction: 'Second' },
        ],
      };
      mockStoryRepo.findOne.mockResolvedValue(story);

      const result = await service.findOne('story-1');
      expect(result.id).toBe('story-1');
      expect(result.steps).toHaveLength(2);
      expect(mockStoryRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'story-1' },
        relations: ['steps'],
        order: { steps: { order: 'ASC' } },
      });
    });

    it('should throw NotFoundException when story does not exist', async () => {
      mockStoryRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update scalar fields', async () => {
      const story = {
        id: 'story-1',
        title: 'Old',
        description: 'Desc',
        priority: Priority.LOW,
        status: StoryStatus.DRAFT,
        steps: [],
      };
      mockStoryRepo.findOne
        .mockResolvedValueOnce(story)
        .mockResolvedValueOnce({ ...story, title: 'New' });
      mockStoryRepo.save.mockResolvedValue({ ...story, title: 'New' });

      const result = await service.update('story-1', { title: 'New' });
      expect(result.title).toBe('New');
    });

    it('should update status', async () => {
      const story = {
        id: 'story-1',
        title: 'S1',
        status: StoryStatus.DRAFT,
        steps: [],
      };
      const updated = { ...story, status: StoryStatus.ACTIVE };
      mockStoryRepo.findOne
        .mockResolvedValueOnce(story)
        .mockResolvedValueOnce(updated);
      mockStoryRepo.save.mockResolvedValue(updated);

      const result = await service.update('story-1', {
        status: StoryStatus.ACTIVE,
      });
      expect(result.status).toBe(StoryStatus.ACTIVE);
    });

    it('should throw NotFoundException when story does not exist', async () => {
      mockStoryRepo.findOne.mockResolvedValue(null);
      await expect(service.update('bad-id', { title: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should sync steps: update existing, create new, delete removed', async () => {
      const story = {
        id: 'story-1',
        title: 'S1',
        steps: [
          {
            id: 'step-1',
            storyId: 'story-1',
            order: 1,
            instruction: 'Old step 1',
          },
          {
            id: 'step-2',
            storyId: 'story-1',
            order: 2,
            instruction: 'Old step 2',
          },
        ],
      };

      mockStoryRepo.findOne
        .mockResolvedValueOnce(story) // initial find
        .mockResolvedValueOnce({ ...story, steps: [] }); // findOne after sync

      await service.update('story-1', {
        steps: [
          { id: 'step-1', order: 1, instruction: 'Updated step 1' },
          { order: 2, instruction: 'Brand new step' },
        ],
      });

      // step-2 should be deleted
      expect(mockStepRepo.delete).toHaveBeenCalled();
      // step-1 should be updated
      expect(mockStepRepo.update).toHaveBeenCalledWith('step-1', {
        order: 1,
        instruction: 'Updated step 1',
      });
      // new step should be created
      expect(mockStepRepo.create).toHaveBeenCalledWith({
        storyId: 'story-1',
        order: 2,
        instruction: 'Brand new step',
      });
    });

    it('should throw BadRequestException for invalid step IDs', async () => {
      const story = {
        id: 'story-1',
        title: 'S1',
        steps: [
          { id: 'step-1', storyId: 'story-1', order: 1, instruction: 'S1' },
        ],
      };
      mockStoryRepo.findOne.mockResolvedValueOnce(story);

      await expect(
        service.update('story-1', {
          steps: [{ id: 'foreign-step', order: 1, instruction: 'Hacked' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delete all existing steps when given all new steps', async () => {
      const story = {
        id: 'story-1',
        title: 'S1',
        steps: [
          { id: 'step-1', storyId: 'story-1', order: 1, instruction: 'Old' },
        ],
      };

      mockStoryRepo.findOne
        .mockResolvedValueOnce(story)
        .mockResolvedValueOnce({ ...story, steps: [] });

      mockStepRepo.create.mockReturnValue({});
      mockStepRepo.save.mockResolvedValue({});

      await service.update('story-1', {
        steps: [{ order: 1, instruction: 'New step' }],
      });

      expect(mockStepRepo.delete).toHaveBeenCalled();
      expect(mockStepRepo.create).toHaveBeenCalledWith({
        storyId: 'story-1',
        order: 1,
        instruction: 'New step',
      });
    });
  });

  describe('remove', () => {
    it('should delete the story', async () => {
      const story = { id: 'story-1' };
      mockStoryRepo.findOne.mockResolvedValue(story);
      mockStoryRepo.remove.mockResolvedValue(story);

      await service.remove('story-1');
      expect(mockStoryRepo.remove).toHaveBeenCalledWith(story);
    });

    it('should throw NotFoundException when story does not exist', async () => {
      mockStoryRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});

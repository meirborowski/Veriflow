import { Test, TestingModule } from '@nestjs/testing';
import { UserStoriesController } from './user-stories.controller';
import { UserStoriesService } from './user-stories.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Priority } from '../common/types/enums';

const mockService = {
  create: jest.fn(),
  findAllByProject: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('UserStoriesController', () => {
  let controller: UserStoriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserStoriesController],
      providers: [{ provide: UserStoriesService, useValue: mockService }],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UserStoriesController>(UserStoriesController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call service.create with projectId and dto', async () => {
      const dto = {
        title: 'Story',
        description: 'Desc',
        priority: Priority.HIGH,
        steps: [{ order: 1, instruction: 'Do something' }],
      };
      const story = { id: 'story-1', ...dto };
      mockService.create.mockResolvedValue(story);

      const result = await controller.create('proj-1', dto);
      expect(result).toEqual(story);
      expect(mockService.create).toHaveBeenCalledWith('proj-1', dto);
    });
  });

  describe('findAll', () => {
    it('should call service.findAllByProject with projectId and query', async () => {
      const response = {
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };
      mockService.findAllByProject.mockResolvedValue(response);

      const result = await controller.findAll('proj-1', {
        page: 1,
        limit: 20,
      });
      expect(result).toEqual(response);
      expect(mockService.findAllByProject).toHaveBeenCalledWith('proj-1', {
        page: 1,
        limit: 20,
      });
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with story id', async () => {
      const story = { id: 'story-1', title: 'S1', steps: [] };
      mockService.findOne.mockResolvedValue(story);

      const result = await controller.findOne('story-1');
      expect(result).toEqual(story);
      expect(mockService.findOne).toHaveBeenCalledWith('story-1');
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto', async () => {
      const dto = { title: 'Updated' };
      const story = { id: 'story-1', title: 'Updated' };
      mockService.update.mockResolvedValue(story);

      const result = await controller.update('story-1', dto);
      expect(result).toEqual(story);
      expect(mockService.update).toHaveBeenCalledWith('story-1', dto);
    });
  });

  describe('remove', () => {
    it('should call service.remove with story id', async () => {
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove('story-1');
      expect(mockService.remove).toHaveBeenCalledWith('story-1');
    });
  });
});

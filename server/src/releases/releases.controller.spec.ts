import { Test, TestingModule } from '@nestjs/testing';
import { ReleasesController } from './releases.controller';
import { ReleasesService } from './releases.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { ReleaseStatus } from '../common/types/enums';

const mockService = {
  create: jest.fn(),
  findAllByProject: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  close: jest.fn(),
  addStories: jest.fn(),
  removeStory: jest.fn(),
};

describe('ReleasesController', () => {
  let controller: ReleasesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReleasesController],
      providers: [{ provide: ReleasesService, useValue: mockService }],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReleasesController>(ReleasesController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call service.create with projectId and dto', async () => {
      const dto = { name: 'v1.0' };
      const release = {
        id: 'release-1',
        projectId: 'proj-1',
        name: 'v1.0',
        status: ReleaseStatus.DRAFT,
      };
      mockService.create.mockResolvedValue(release);

      const result = await controller.create('proj-1', dto);
      expect(result).toEqual(release);
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
    it('should call service.findOne with release id', async () => {
      const release = {
        id: 'release-1',
        name: 'v1.0',
        status: ReleaseStatus.DRAFT,
        stories: [],
      };
      mockService.findOne.mockResolvedValue(release);

      const result = await controller.findOne('release-1');
      expect(result).toEqual(release);
      expect(mockService.findOne).toHaveBeenCalledWith('release-1');
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto', async () => {
      const dto = { name: 'v1.1' };
      const release = { id: 'release-1', name: 'v1.1' };
      mockService.update.mockResolvedValue(release);

      const result = await controller.update('release-1', dto);
      expect(result).toEqual(release);
      expect(mockService.update).toHaveBeenCalledWith('release-1', dto);
    });
  });

  describe('close', () => {
    it('should call service.close with release id', async () => {
      const response = {
        id: 'release-1',
        name: 'v1.0',
        status: ReleaseStatus.CLOSED,
        closedAt: new Date(),
        storyCount: 3,
      };
      mockService.close.mockResolvedValue(response);

      const result = await controller.close('release-1');
      expect(result).toEqual(response);
      expect(mockService.close).toHaveBeenCalledWith('release-1');
    });
  });

  describe('addStories', () => {
    it('should call service.addStories with id and dto', async () => {
      const dto = { storyIds: ['story-1', 'story-2'] };
      mockService.addStories.mockResolvedValue({ added: 2 });

      const result = await controller.addStories('release-1', dto);
      expect(result).toEqual({ added: 2 });
      expect(mockService.addStories).toHaveBeenCalledWith('release-1', dto);
    });
  });

  describe('removeStory', () => {
    it('should call service.removeStory with release id and story id', async () => {
      mockService.removeStory.mockResolvedValue(undefined);

      await controller.removeStory('release-1', 'story-1');
      expect(mockService.removeStory).toHaveBeenCalledWith(
        'release-1',
        'story-1',
      );
    });
  });

  describe('remove', () => {
    it('should call service.remove with release id', async () => {
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove('release-1');
      expect(mockService.remove).toHaveBeenCalledWith('release-1');
    });
  });
});

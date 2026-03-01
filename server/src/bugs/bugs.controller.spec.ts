import { Test, TestingModule } from '@nestjs/testing';
import { BugsController } from './bugs.controller';
import { BugsService } from './bugs.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { BugSeverity, BugStatus } from '../common/types/enums';

const mockService = {
  create: jest.fn(),
  findAllByProject: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('BugsController', () => {
  let controller: BugsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BugsController],
      providers: [{ provide: BugsService, useValue: mockService }],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BugsController>(BugsController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call service.create with projectId, userId, and dto', async () => {
      const dto = {
        storyId: 'story-1',
        title: 'Login fails',
        description: 'Button broken',
        severity: BugSeverity.MAJOR,
      };
      const bug = { id: 'bug-1', ...dto, status: BugStatus.OPEN };
      mockService.create.mockResolvedValue(bug);

      const result = await controller.create(
        'proj-1',
        { userId: 'user-1', email: 'test@test.com' },
        dto,
      );
      expect(result).toEqual(bug);
      expect(mockService.create).toHaveBeenCalledWith('proj-1', 'user-1', dto);
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
    it('should call service.findOne with bug id', async () => {
      const bug = { id: 'bug-1', title: 'Login fails' };
      mockService.findOne.mockResolvedValue(bug);

      const result = await controller.findOne('bug-1');
      expect(result).toEqual(bug);
      expect(mockService.findOne).toHaveBeenCalledWith('bug-1');
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto', async () => {
      const dto = { status: BugStatus.RESOLVED };
      const bug = { id: 'bug-1', status: BugStatus.RESOLVED };
      mockService.update.mockResolvedValue(bug);

      const result = await controller.update('bug-1', dto);
      expect(result).toEqual(bug);
      expect(mockService.update).toHaveBeenCalledWith('bug-1', dto);
    });
  });

  describe('remove', () => {
    it('should call service.remove with bug id', async () => {
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove('bug-1');
      expect(mockService.remove).toHaveBeenCalledWith('bug-1');
    });
  });
});

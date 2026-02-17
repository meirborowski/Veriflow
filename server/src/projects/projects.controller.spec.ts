import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/types/enums';

const mockProjectsService = {
  create: jest.fn(),
  findAllForUser: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  addMember: jest.fn(),
  updateMemberRole: jest.fn(),
  removeMember: jest.fn(),
};

const mockUser = { userId: 'user-1', email: 'test@test.com' };

describe('ProjectsController', () => {
  let controller: ProjectsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: mockProjectsService }],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProjectsController>(ProjectsController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call service.create with userId and dto', async () => {
      const dto = { name: 'P1' };
      const project = { id: 'proj-1', name: 'P1' };
      mockProjectsService.create.mockResolvedValue(project);

      const result = await controller.create(mockUser, dto);
      expect(result).toEqual(project);
      expect(mockProjectsService.create).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('findAll', () => {
    it('should call service.findAllForUser with pagination', async () => {
      const response = {
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };
      mockProjectsService.findAllForUser.mockResolvedValue(response);

      const result = await controller.findAll(mockUser, {
        page: 1,
        limit: 20,
      });
      expect(result).toEqual(response);
      expect(mockProjectsService.findAllForUser).toHaveBeenCalledWith(
        'user-1',
        1,
        20,
      );
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with projectId and userId', async () => {
      const detail = { id: 'proj-1', name: 'P1', members: [] };
      mockProjectsService.findOne.mockResolvedValue(detail);

      const result = await controller.findOne('proj-1', mockUser);
      expect(result).toEqual(detail);
      expect(mockProjectsService.findOne).toHaveBeenCalledWith(
        'proj-1',
        'user-1',
      );
    });
  });

  describe('update', () => {
    it('should call service.update with projectId and dto', async () => {
      const dto = { name: 'Updated' };
      const project = { id: 'proj-1', name: 'Updated' };
      mockProjectsService.update.mockResolvedValue(project);

      const result = await controller.update('proj-1', dto);
      expect(result).toEqual(project);
      expect(mockProjectsService.update).toHaveBeenCalledWith('proj-1', dto);
    });
  });

  describe('remove', () => {
    it('should call service.remove with projectId', async () => {
      mockProjectsService.remove.mockResolvedValue(undefined);

      await controller.remove('proj-1');
      expect(mockProjectsService.remove).toHaveBeenCalledWith('proj-1');
    });
  });

  describe('addMember', () => {
    it('should call service.addMember with projectId and dto', async () => {
      const dto = { email: 'dev@test.com', role: UserRole.DEVELOPER };
      const member = {
        userId: 'user-2',
        projectId: 'proj-1',
        role: UserRole.DEVELOPER,
      };
      mockProjectsService.addMember.mockResolvedValue(member);

      const result = await controller.addMember('proj-1', dto);
      expect(result).toEqual(member);
      expect(mockProjectsService.addMember).toHaveBeenCalledWith('proj-1', dto);
    });
  });

  describe('updateMemberRole', () => {
    it('should call service.updateMemberRole', async () => {
      const dto = { role: UserRole.PM };
      const member = {
        userId: 'user-2',
        projectId: 'proj-1',
        role: UserRole.PM,
      };
      mockProjectsService.updateMemberRole.mockResolvedValue(member);

      const result = await controller.updateMemberRole('proj-1', 'user-2', dto);
      expect(result).toEqual(member);
      expect(mockProjectsService.updateMemberRole).toHaveBeenCalledWith(
        'proj-1',
        'user-2',
        dto,
      );
    });
  });

  describe('removeMember', () => {
    it('should call service.removeMember', async () => {
      mockProjectsService.removeMember.mockResolvedValue(undefined);

      await controller.removeMember('proj-1', 'user-2');
      expect(mockProjectsService.removeMember).toHaveBeenCalledWith(
        'proj-1',
        'user-2',
      );
    });
  });
});

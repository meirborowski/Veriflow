import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../common/types/enums';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const mockProjectRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockMemberRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    remove: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getRepositoryToken(Project), useValue: mockProjectRepo },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: mockMemberRepo,
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a project and add creator as ADMIN', async () => {
      const project = { id: 'proj-1', name: 'Test', description: null };
      mockProjectRepo.create.mockReturnValue(project);
      mockProjectRepo.save.mockResolvedValue(project);
      const member = {
        userId: 'user-1',
        projectId: 'proj-1',
        role: UserRole.ADMIN,
      };
      mockMemberRepo.create.mockReturnValue(member);
      mockMemberRepo.save.mockResolvedValue(member);

      const result = await service.create('user-1', { name: 'Test' });
      expect(result).toEqual(project);
      expect(mockMemberRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.ADMIN }),
      );
    });

    it('should store description when provided', async () => {
      const project = {
        id: 'proj-1',
        name: 'Test',
        description: 'A description',
      };
      mockProjectRepo.create.mockReturnValue(project);
      mockProjectRepo.save.mockResolvedValue(project);
      mockMemberRepo.create.mockReturnValue({});
      mockMemberRepo.save.mockResolvedValue({});

      await service.create('user-1', {
        name: 'Test',
        description: 'A description',
      });
      expect(mockProjectRepo.create).toHaveBeenCalledWith({
        name: 'Test',
        description: 'A description',
      });
    });
  });

  describe('findAllForUser', () => {
    it('should return paginated projects with roles', async () => {
      const members = [
        {
          role: UserRole.ADMIN,
          project: {
            id: 'proj-1',
            name: 'P1',
            description: null,
            createdAt: new Date(),
          },
        },
      ];
      mockMemberRepo.findAndCount.mockResolvedValue([members, 1]);

      const result = await service.findAllForUser('user-1', 1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].role).toBe(UserRole.ADMIN);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should return empty data when user has no projects', async () => {
      mockMemberRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAllForUser('user-1', 1, 20);
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('should calculate correct totalPages', async () => {
      mockMemberRepo.findAndCount.mockResolvedValue([[], 45]);

      const result = await service.findAllForUser('user-1', 1, 20);
      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('findOne', () => {
    it('should return project detail when user is a member', async () => {
      const project = {
        id: 'proj-1',
        name: 'P1',
        description: 'desc',
        createdAt: new Date(),
        members: [
          {
            userId: 'user-1',
            user: { name: 'Jane', email: 'jane@test.com' },
            role: UserRole.ADMIN,
          },
        ],
      };
      mockProjectRepo.findOne.mockResolvedValue(project);

      const result = await service.findOne('proj-1', 'user-1');
      expect(result.id).toBe('proj-1');
      expect(result.members).toHaveLength(1);
    });

    it('should throw NotFoundException when project does not exist', async () => {
      mockProjectRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not a member', async () => {
      const project = {
        id: 'proj-1',
        name: 'P1',
        members: [
          {
            userId: 'other-user',
            user: { name: 'Other', email: 'other@test.com' },
            role: UserRole.ADMIN,
          },
        ],
      };
      mockProjectRepo.findOne.mockResolvedValue(project);

      await expect(service.findOne('proj-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('should update project fields', async () => {
      const project = { id: 'proj-1', name: 'Old', description: null };
      mockProjectRepo.findOne.mockResolvedValue(project);
      mockProjectRepo.save.mockResolvedValue({
        ...project,
        name: 'New',
      });

      const result = await service.update('proj-1', { name: 'New' });
      expect(result.name).toBe('New');
    });

    it('should throw NotFoundException when project does not exist', async () => {
      mockProjectRepo.findOne.mockResolvedValue(null);
      await expect(service.update('bad-id', { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete the project', async () => {
      const project = { id: 'proj-1' };
      mockProjectRepo.findOne.mockResolvedValue(project);
      mockProjectRepo.remove.mockResolvedValue(project);

      await service.remove('proj-1');
      expect(mockProjectRepo.remove).toHaveBeenCalledWith(project);
    });

    it('should throw NotFoundException when project does not exist', async () => {
      mockProjectRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addMember', () => {
    it('should add a user as a project member', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 'user-2',
        email: 'dev@test.com',
      });
      mockMemberRepo.findOne.mockResolvedValue(null);
      const member = {
        userId: 'user-2',
        projectId: 'proj-1',
        role: UserRole.DEVELOPER,
      };
      mockMemberRepo.create.mockReturnValue(member);
      mockMemberRepo.save.mockResolvedValue(member);

      const result = await service.addMember('proj-1', {
        email: 'dev@test.com',
        role: UserRole.DEVELOPER,
      });
      expect(result.role).toBe(UserRole.DEVELOPER);
    });

    it('should throw NotFoundException when user email does not exist', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(
        service.addMember('proj-1', {
          email: 'nobody@test.com',
          role: UserRole.DEVELOPER,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when user is already a member', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 'user-2',
        email: 'dev@test.com',
      });
      mockMemberRepo.findOne.mockResolvedValue({
        userId: 'user-2',
        projectId: 'proj-1',
      });

      await expect(
        service.addMember('proj-1', {
          email: 'dev@test.com',
          role: UserRole.DEVELOPER,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateMemberRole', () => {
    it('should update the member role', async () => {
      const member = {
        userId: 'user-2',
        projectId: 'proj-1',
        role: UserRole.DEVELOPER,
      };
      mockMemberRepo.findOne.mockResolvedValue(member);
      mockMemberRepo.save.mockResolvedValue({
        ...member,
        role: UserRole.PM,
      });

      const result = await service.updateMemberRole('proj-1', 'user-2', {
        role: UserRole.PM,
      });
      expect(result.role).toBe(UserRole.PM);
    });

    it('should throw NotFoundException when member does not exist', async () => {
      mockMemberRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateMemberRole('proj-1', 'user-2', {
          role: UserRole.PM,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when demoting the last admin', async () => {
      const member = {
        userId: 'user-1',
        projectId: 'proj-1',
        role: UserRole.ADMIN,
      };
      mockMemberRepo.findOne.mockResolvedValue(member);
      mockMemberRepo.count.mockResolvedValue(1);

      await expect(
        service.updateMemberRole('proj-1', 'user-1', {
          role: UserRole.DEVELOPER,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow demoting an admin when other admins exist', async () => {
      const member = {
        userId: 'user-2',
        projectId: 'proj-1',
        role: UserRole.ADMIN,
      };
      mockMemberRepo.findOne.mockResolvedValue(member);
      mockMemberRepo.count.mockResolvedValue(2);
      mockMemberRepo.save.mockResolvedValue({
        ...member,
        role: UserRole.DEVELOPER,
      });

      const result = await service.updateMemberRole('proj-1', 'user-2', {
        role: UserRole.DEVELOPER,
      });
      expect(result.role).toBe(UserRole.DEVELOPER);
    });
  });

  describe('removeMember', () => {
    it('should remove a non-admin member', async () => {
      const member = {
        userId: 'user-2',
        projectId: 'proj-1',
        role: UserRole.DEVELOPER,
      };
      mockMemberRepo.findOne.mockResolvedValue(member);
      mockMemberRepo.remove.mockResolvedValue(member);

      await service.removeMember('proj-1', 'user-2');
      expect(mockMemberRepo.remove).toHaveBeenCalledWith(member);
    });

    it('should throw NotFoundException when member does not exist', async () => {
      mockMemberRepo.findOne.mockResolvedValue(null);
      await expect(service.removeMember('proj-1', 'user-2')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow removing an admin when other admins exist', async () => {
      const member = {
        userId: 'user-2',
        projectId: 'proj-1',
        role: UserRole.ADMIN,
      };
      mockMemberRepo.findOne.mockResolvedValue(member);
      mockMemberRepo.count.mockResolvedValue(2);
      mockMemberRepo.remove.mockResolvedValue(member);

      await service.removeMember('proj-1', 'user-2');
      expect(mockMemberRepo.remove).toHaveBeenCalledWith(member);
    });

    it('should throw BadRequestException when removing the last admin', async () => {
      const member = {
        userId: 'user-1',
        projectId: 'proj-1',
        role: UserRole.ADMIN,
      };
      mockMemberRepo.findOne.mockResolvedValue(member);
      mockMemberRepo.count.mockResolvedValue(1);

      await expect(service.removeMember('proj-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

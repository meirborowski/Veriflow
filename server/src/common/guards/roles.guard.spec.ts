import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../types/enums';
import { Repository } from 'typeorm';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { UserStory } from '../../user-stories/entities/user-story.entity';
import { Release } from '../../releases/entities/release.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RESOLVE_PROJECT_KEY } from '../decorators/resolve-project.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let memberRepository: jest.Mocked<Repository<ProjectMember>>;
  let storyRepository: jest.Mocked<Repository<UserStory>>;
  let releaseRepository: jest.Mocked<Repository<Release>>;

  beforeEach(() => {
    reflector = new Reflector();
    memberRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<ProjectMember>>;
    storyRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<UserStory>>;
    releaseRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Release>>;

    guard = new RolesGuard(
      reflector,
      memberRepository,
      storyRepository,
      releaseRepository,
    );
  });

  function createMockContext(
    user?: { userId: string; email: string },
    params: Record<string, string> = {},
  ): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user, params }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow when no @Roles() decorator is present', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext();
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow when @Roles() has empty array', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    const context = createMockContext();
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when no user is present', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === ROLES_KEY) return [UserRole.ADMIN];
        return undefined;
      });
    const context = createMockContext(undefined, { id: 'project-1' });
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw ForbiddenException when no project ID in params', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === ROLES_KEY) return [UserRole.ADMIN];
        return undefined;
      });
    const context = createMockContext(
      { userId: 'user-1', email: 'test@test.com' },
      {},
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw ForbiddenException when user is not a member', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === ROLES_KEY) return [UserRole.ADMIN];
        return undefined;
      });
    memberRepository.findOne.mockResolvedValue(null);
    const context = createMockContext(
      { userId: 'user-1', email: 'test@test.com' },
      { id: 'project-1' },
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw ForbiddenException when user role is insufficient', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === ROLES_KEY) return [UserRole.ADMIN];
        return undefined;
      });
    memberRepository.findOne.mockResolvedValue({
      userId: 'user-1',
      projectId: 'project-1',
      role: UserRole.TESTER,
    } as ProjectMember);
    const context = createMockContext(
      { userId: 'user-1', email: 'test@test.com' },
      { id: 'project-1' },
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should allow when user has the required role', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === ROLES_KEY) return [UserRole.ADMIN];
        return undefined;
      });
    memberRepository.findOne.mockResolvedValue({
      userId: 'user-1',
      projectId: 'project-1',
      role: UserRole.ADMIN,
    } as ProjectMember);
    const context = createMockContext(
      { userId: 'user-1', email: 'test@test.com' },
      { id: 'project-1' },
    );
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow when user has one of multiple required roles', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === ROLES_KEY) return [UserRole.ADMIN, UserRole.PM];
        return undefined;
      });
    memberRepository.findOne.mockResolvedValue({
      userId: 'user-1',
      projectId: 'project-1',
      role: UserRole.PM,
    } as ProjectMember);
    const context = createMockContext(
      { userId: 'user-1', email: 'test@test.com' },
      { id: 'project-1' },
    );
    expect(await guard.canActivate(context)).toBe(true);
  });

  // New tests for projectId param fallback and story resolution

  it('should use params.projectId when params.id is absent', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === ROLES_KEY) return [UserRole.ADMIN];
        return undefined;
      });
    memberRepository.findOne.mockResolvedValue({
      userId: 'user-1',
      projectId: 'project-1',
      role: UserRole.ADMIN,
    } as ProjectMember);
    const context = createMockContext(
      { userId: 'user-1', email: 'test@test.com' },
      { projectId: 'project-1' },
    );
    expect(await guard.canActivate(context)).toBe(true);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(memberRepository.findOne).toHaveBeenCalledWith({
      where: { userId: 'user-1', projectId: 'project-1' },
    });
  });

  it('should resolve projectId from story when @ResolveProjectFrom("story") is set', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === ROLES_KEY) return [UserRole.ADMIN];
        if (key === RESOLVE_PROJECT_KEY) return 'story';
        return undefined;
      });

    storyRepository.findOne.mockResolvedValue({
      id: 'story-1',
      projectId: 'project-1',
    } as UserStory);

    memberRepository.findOne.mockResolvedValue({
      userId: 'user-1',
      projectId: 'project-1',
      role: UserRole.ADMIN,
    } as ProjectMember);

    const context = createMockContext(
      { userId: 'user-1', email: 'test@test.com' },
      { id: 'story-1' },
    );

    expect(await guard.canActivate(context)).toBe(true);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(storyRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'story-1' },
      select: ['id', 'projectId'],
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(memberRepository.findOne).toHaveBeenCalledWith({
      where: { userId: 'user-1', projectId: 'project-1' },
    });
  });

  it('should throw NotFoundException when story is not found during resolution', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === ROLES_KEY) return [UserRole.ADMIN];
        if (key === RESOLVE_PROJECT_KEY) return 'story';
        return undefined;
      });

    storyRepository.findOne.mockResolvedValue(null);

    const context = createMockContext(
      { userId: 'user-1', email: 'test@test.com' },
      { id: 'nonexistent-story' },
    );

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException when story ID param is missing for story resolution', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === ROLES_KEY) return [UserRole.ADMIN];
        if (key === RESOLVE_PROJECT_KEY) return 'story';
        return undefined;
      });

    const context = createMockContext(
      { userId: 'user-1', email: 'test@test.com' },
      {},
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  // Release resolution tests

  it('should resolve projectId from release when @ResolveProjectFrom("release") is set', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === ROLES_KEY) return [UserRole.ADMIN];
        if (key === RESOLVE_PROJECT_KEY) return 'release';
        return undefined;
      });

    releaseRepository.findOne.mockResolvedValue({
      id: 'release-1',
      projectId: 'project-1',
    } as Release);

    memberRepository.findOne.mockResolvedValue({
      userId: 'user-1',
      projectId: 'project-1',
      role: UserRole.ADMIN,
    } as ProjectMember);

    const context = createMockContext(
      { userId: 'user-1', email: 'test@test.com' },
      { id: 'release-1' },
    );

    expect(await guard.canActivate(context)).toBe(true);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(releaseRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'release-1' },
      select: ['id', 'projectId'],
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(memberRepository.findOne).toHaveBeenCalledWith({
      where: { userId: 'user-1', projectId: 'project-1' },
    });
  });

  it('should throw NotFoundException when release is not found during resolution', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === ROLES_KEY) return [UserRole.ADMIN];
        if (key === RESOLVE_PROJECT_KEY) return 'release';
        return undefined;
      });

    releaseRepository.findOne.mockResolvedValue(null);

    const context = createMockContext(
      { userId: 'user-1', email: 'test@test.com' },
      { id: 'nonexistent-release' },
    );

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException when release ID param is missing for release resolution', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === ROLES_KEY) return [UserRole.ADMIN];
        if (key === RESOLVE_PROJECT_KEY) return 'release';
        return undefined;
      });

    const context = createMockContext(
      { userId: 'user-1', email: 'test@test.com' },
      {},
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });
});

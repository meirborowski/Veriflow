import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../types/enums';
import { Repository } from 'typeorm';
import { ProjectMember } from '../../projects/entities/project-member.entity';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let memberRepository: jest.Mocked<Repository<ProjectMember>>;

  beforeEach(() => {
    reflector = new Reflector();
    memberRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<ProjectMember>>;

    guard = new RolesGuard(reflector, memberRepository);
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
      .mockReturnValue([UserRole.ADMIN]);
    const context = createMockContext(undefined, { id: 'project-1' });
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw ForbiddenException when no project ID in params', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.ADMIN]);
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
      .mockReturnValue([UserRole.ADMIN]);
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
      .mockReturnValue([UserRole.ADMIN]);
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
      .mockReturnValue([UserRole.ADMIN]);
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
      .mockReturnValue([UserRole.ADMIN, UserRole.PM]);
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
});

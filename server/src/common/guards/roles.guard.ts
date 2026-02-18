import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RESOLVE_PROJECT_KEY } from '../decorators/resolve-project.decorator';
import { UserRole } from '../types/enums';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { UserStory } from '../../user-stories/entities/user-story.entity';
import type { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(ProjectMember)
    private readonly memberRepository: Repository<ProjectMember>,
    @InjectRepository(UserStory)
    private readonly storyRepository: Repository<UserStory>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    let projectId: string | undefined;

    const resolveFrom = this.reflector.getAllAndOverride<string>(
      RESOLVE_PROJECT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (resolveFrom === 'story') {
      const storyId = request.params.id as string | undefined;
      if (!storyId) {
        throw new ForbiddenException('Story ID is required');
      }

      const story = await this.storyRepository.findOne({
        where: { id: storyId },
        select: ['id', 'projectId'],
      });

      if (!story) {
        throw new NotFoundException('Story not found');
      }

      projectId = story.projectId;
    } else {
      projectId = (request.params.projectId ?? request.params.id) as
        | string
        | undefined;
    }

    if (!projectId) {
      throw new ForbiddenException('Project ID is required');
    }

    const member = await this.memberRepository.findOne({
      where: { userId: user.userId, projectId },
    });

    if (!member) {
      throw new ForbiddenException('Not a member of this project');
    }

    if (!requiredRoles.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RESOLVE_PROJECT_KEY } from '../decorators/resolve-project.decorator';
import { UserRole } from '../types/enums';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { UserStory } from '../../user-stories/entities/user-story.entity';
import { Release } from '../../releases/entities/release.entity';
import { TestExecution } from '../../test-execution/entities/test-execution.entity';
import { Bug } from '../../bugs/entities/bug.entity';
import { Attachment } from '../../attachments/entities/attachment.entity';
import type { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(ProjectMember)
    private readonly memberRepository: Repository<ProjectMember>,
    @InjectRepository(UserStory)
    private readonly storyRepository: Repository<UserStory>,
    @InjectRepository(Release)
    private readonly releaseRepository: Repository<Release>,
    @InjectRepository(TestExecution)
    private readonly executionRepository: Repository<TestExecution>,
    @InjectRepository(Bug)
    private readonly bugRepository: Repository<Bug>,
    @InjectRepository(Attachment)
    private readonly attachmentRepository: Repository<Attachment>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
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
    } else if (resolveFrom === 'release') {
      const releaseId = request.params.id as string | undefined;
      if (!releaseId) {
        throw new ForbiddenException('Release ID is required');
      }

      const release = await this.releaseRepository.findOne({
        where: { id: releaseId },
        select: ['id', 'projectId'],
      });

      if (!release) {
        throw new NotFoundException('Release not found');
      }

      projectId = release.projectId;
    } else if (resolveFrom === 'execution') {
      const executionId = request.params.id as string | undefined;
      if (!executionId) {
        throw new ForbiddenException('Execution ID is required');
      }

      const execution = await this.executionRepository.findOne({
        where: { id: executionId },
        select: ['id', 'releaseId'],
      });

      if (!execution) {
        throw new NotFoundException('Execution not found');
      }

      const release = await this.releaseRepository.findOne({
        where: { id: execution.releaseId },
        select: ['id', 'projectId'],
      });

      if (!release) {
        throw new NotFoundException('Release not found');
      }

      projectId = release.projectId;
    } else if (resolveFrom === 'bug') {
      const bugId = request.params.id as string | undefined;
      if (!bugId) {
        throw new ForbiddenException('Bug ID is required');
      }

      const bug = await this.bugRepository.findOne({
        where: { id: bugId },
        select: ['id', 'projectId'],
      });

      if (!bug) {
        throw new NotFoundException('Bug not found');
      }

      projectId = bug.projectId;
    } else if (resolveFrom === 'attachment') {
      const attachmentId = request.params.id as string | undefined;
      if (!attachmentId) {
        throw new ForbiddenException('Attachment ID is required');
      }

      const attachment = await this.attachmentRepository.findOne({
        where: { id: attachmentId },
        select: ['id', 'entityType', 'entityId'],
      });

      if (!attachment) {
        throw new NotFoundException('Attachment not found');
      }

      if (attachment.entityType === 'story') {
        const story = await this.storyRepository.findOne({
          where: { id: attachment.entityId },
          select: ['id', 'projectId'],
        });
        if (!story) throw new NotFoundException('Story not found');
        projectId = story.projectId;
      } else if (attachment.entityType === 'bug') {
        const bug = await this.bugRepository.findOne({
          where: { id: attachment.entityId },
          select: ['id', 'projectId'],
        });
        if (!bug) throw new NotFoundException('Bug not found');
        projectId = bug.projectId;
      } else {
        throw new ForbiddenException(
          `Invalid attachment entity type: ${attachment.entityType}`,
        );
      }
    } else if (resolveFrom === 'automation-test') {
      const testId = request.params.id as string | undefined;
      if (!testId) {
        throw new ForbiddenException('Test ID is required');
      }

      const test = await this.dataSource.query<{ projectId: string }[]>(
        `SELECT "projectId" FROM playwright_tests WHERE id = $1 LIMIT 1`,
        [testId],
      );

      if (!test.length) {
        throw new NotFoundException('Playwright test not found');
      }

      projectId = test[0].projectId;
    } else if (resolveFrom === 'automation-run') {
      const runId = request.params.id as string | undefined;
      if (!runId) {
        throw new ForbiddenException('Run ID is required');
      }

      const run = await this.dataSource.query<{ projectId: string }[]>(
        `SELECT "projectId" FROM automation_runs WHERE id = $1 LIMIT 1`,
        [runId],
      );

      if (!run.length) {
        throw new NotFoundException('Automation run not found');
      }

      projectId = run[0].projectId;
    } else if (resolveFrom === 'attachment-entity') {
      const body = request.body as Record<string, unknown> | undefined;
      const entityType = (request.params.entityType ?? body?.entityType) as
        | string
        | undefined;
      const entityId = (request.params.entityId ?? body?.entityId) as
        | string
        | undefined;

      if (!entityType || !entityId) {
        throw new ForbiddenException('Entity type and entity ID are required');
      }

      if (entityType === 'story') {
        const story = await this.storyRepository.findOne({
          where: { id: entityId },
          select: ['id', 'projectId'],
        });
        if (!story) throw new NotFoundException('Story not found');
        projectId = story.projectId;
      } else if (entityType === 'bug') {
        const bug = await this.bugRepository.findOne({
          where: { id: entityId },
          select: ['id', 'projectId'],
        });
        if (!bug) throw new NotFoundException('Bug not found');
        projectId = bug.projectId;
      } else {
        throw new ForbiddenException(`Invalid entity type: ${entityType}`);
      }
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

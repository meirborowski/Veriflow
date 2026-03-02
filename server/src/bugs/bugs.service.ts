import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Bug } from './entities/bug.entity';
import { UserStory } from '../user-stories/entities/user-story.entity';
import { TestExecution } from '../test-execution/entities/test-execution.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { ReleaseStory } from '../releases/entities/release-story.entity';
import { Release } from '../releases/entities/release.entity';
import { CreateBugDto } from './dto/create-bug.dto';
import { UpdateBugDto } from './dto/update-bug.dto';
import { BugQueryDto } from './dto/bug-query.dto';
import {
  BugSeverity,
  BugStatus,
  NotificationType,
} from '../common/types/enums';
import type { PaginatedResponse } from '../common/types/pagination';
import type { BugReportDto } from '../test-execution/dto/submit-result.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

export interface BugListItem {
  id: string;
  title: string;
  severity: BugSeverity;
  status: BugStatus;
  storyTitle: string;
  reportedByName: string;
  assignedToName: string | null;
  createdAt: Date;
}

@Injectable()
export class BugsService {
  private readonly logger = new Logger(BugsService.name);

  constructor(
    @InjectRepository(Bug)
    private readonly bugRepository: Repository<Bug>,
    @InjectRepository(UserStory)
    private readonly storyRepository: Repository<UserStory>,
    @InjectRepository(ProjectMember)
    private readonly memberRepository: Repository<ProjectMember>,
    @InjectRepository(ReleaseStory)
    private readonly releaseStoryRepository: Repository<ReleaseStory>,
    @InjectRepository(Release)
    private readonly releaseRepository: Repository<Release>,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(
    projectId: string,
    userId: string,
    dto: CreateBugDto,
  ): Promise<Bug> {
    const story = await this.storyRepository.findOne({
      where: { id: dto.storyId, projectId },
    });

    if (!story) {
      throw new NotFoundException('Story not found in this project');
    }

    if (dto.executionId) {
      // Validate execution exists within the same project
      const execution = await this.bugRepository.manager
        .getRepository(TestExecution)
        .createQueryBuilder('execution')
        .innerJoin('execution.releaseStory', 'releaseStory')
        .innerJoin('releaseStory.release', 'release')
        .where('execution.id = :executionId', { executionId: dto.executionId })
        .andWhere('release.projectId = :projectId', { projectId })
        .getOne();

      if (!execution) {
        throw new NotFoundException('Execution not found in this project');
      }
    }

    const bug = this.bugRepository.create({
      projectId,
      storyId: dto.storyId,
      executionId: dto.executionId ?? null,
      title: dto.title,
      description: dto.description,
      severity: dto.severity,
      status: BugStatus.OPEN,
      reportedById: userId,
    });

    const saved = await this.bugRepository.save(bug);

    this.logger.log(
      `Bug created: id=${saved.id}, project=${projectId}, story=${dto.storyId}`,
    );

    return this.findOne(saved.id);
  }

  async createFromExecution(
    execution: TestExecution,
    userId: string,
    bugPayload: BugReportDto,
  ): Promise<Bug> {
    // Resolve the master storyId from the releaseStory
    const releaseStory = await this.releaseStoryRepository.findOne({
      where: { id: execution.releaseStoryId },
      select: ['id', 'sourceStoryId', 'releaseId'],
    });

    if (!releaseStory) {
      throw new NotFoundException('Release story not found');
    }

    // Get the projectId from the release
    const release = await this.releaseRepository.findOne({
      where: { id: releaseStory.releaseId },
      select: ['id', 'projectId'],
    });

    if (!release) {
      throw new NotFoundException('Release not found');
    }

    const projectId = release.projectId;
    const storyId = releaseStory.sourceStoryId;

    if (!storyId) {
      throw new BadRequestException(
        'Cannot create bug: source story has been deleted',
      );
    }

    const bug = this.bugRepository.create({
      projectId,
      storyId,
      executionId: execution.id,
      title: bugPayload.title,
      description: bugPayload.description,
      severity: bugPayload.severity,
      status: BugStatus.OPEN,
      reportedById: userId,
    });

    const saved = await this.bugRepository.save(bug);

    this.logger.log(
      `Bug auto-created from execution: id=${saved.id}, execution=${execution.id}`,
    );

    return saved;
  }

  async findAllByProject(
    projectId: string,
    query: BugQueryDto,
  ): Promise<PaginatedResponse<BugListItem>> {
    const qb = this.bugRepository
      .createQueryBuilder('bug')
      .select([
        'bug.id AS id',
        'bug.title AS title',
        'bug.severity AS severity',
        'bug.status AS status',
        'story.title AS "storyTitle"',
        'reporter.name AS "reportedByName"',
        'assignee.name AS "assignedToName"',
        'bug.createdAt AS "createdAt"',
      ])
      .innerJoin('user_stories', 'story', 'story.id = bug.storyId')
      .innerJoin('users', 'reporter', 'reporter.id = bug.reportedById')
      .leftJoin('users', 'assignee', 'assignee.id = bug.assignedToId')
      .where('bug.projectId = :projectId', { projectId });

    this.applyFilters(qb, query);

    const countQb = this.bugRepository
      .createQueryBuilder('bug')
      .where('bug.projectId = :projectId', { projectId });

    this.applyFilters(countQb, query);

    const total = await countQb.getCount();

    const allowedSort: Record<string, string> = {
      createdAt: 'bug.createdAt',
      title: 'bug.title',
      severity: 'bug.severity',
      status: 'bug.status',
    };
    const sortColumn = allowedSort[query.orderBy ?? ''] ?? 'bug.createdAt';
    const sortDir = query.sortDir === 'ASC' ? 'ASC' : 'DESC';

    const data = await qb
      .orderBy(sortColumn, sortDir)
      .offset((query.page - 1) * query.limit)
      .limit(query.limit)
      .getRawMany<BugListItem>();

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(bugId: string): Promise<Bug> {
    const bug = await this.bugRepository.findOne({
      where: { id: bugId },
      relations: ['story', 'execution', 'reportedBy', 'assignedTo'],
    });

    if (!bug) {
      throw new NotFoundException('Bug not found');
    }

    return bug;
  }

  async update(bugId: string, dto: UpdateBugDto): Promise<Bug> {
    const bug = await this.bugRepository.findOne({
      where: { id: bugId },
    });

    if (!bug) {
      throw new NotFoundException('Bug not found');
    }

    const previousAssignedToId = bug.assignedToId;
    const previousStatus = bug.status;

    if (dto.assignedToId !== undefined && dto.assignedToId !== null) {
      const member = await this.memberRepository.findOne({
        where: { userId: dto.assignedToId, projectId: bug.projectId },
      });

      if (!member) {
        throw new BadRequestException(
          'Assignee is not a member of this project',
        );
      }
    }

    Object.assign(bug, dto);
    await this.bugRepository.save(bug);

    this.logger.log(`Bug updated: id=${bugId}`);

    // Notify assignee when assigned
    if (dto.assignedToId && dto.assignedToId !== previousAssignedToId) {
      const notification = await this.notificationsService.create({
        userId: dto.assignedToId,
        type: NotificationType.BUG_ASSIGNED,
        title: 'Bug assigned to you',
        message: `You have been assigned to bug: ${bug.title}`,
        relatedEntityType: 'bug',
        relatedEntityId: bugId,
      });
      this.notificationsGateway.notifyUser(dto.assignedToId, notification);
    }

    // Notify reporter when status changes
    if (dto.status && dto.status !== previousStatus) {
      const notification = await this.notificationsService.create({
        userId: bug.reportedById,
        type: NotificationType.BUG_STATUS_CHANGED,
        title: 'Bug status changed',
        message: `Bug "${bug.title}" status changed to ${dto.status}`,
        relatedEntityType: 'bug',
        relatedEntityId: bugId,
      });
      this.notificationsGateway.notifyUser(bug.reportedById, notification);
    }

    return this.findOne(bugId);
  }

  async remove(bugId: string): Promise<void> {
    const bug = await this.bugRepository.findOne({
      where: { id: bugId },
    });

    if (!bug) {
      throw new NotFoundException('Bug not found');
    }

    await this.bugRepository.remove(bug);

    this.logger.log(`Bug deleted: id=${bugId}`);
  }

  private applyFilters(qb: SelectQueryBuilder<Bug>, query: BugQueryDto): void {
    if (query.status) {
      qb.andWhere('bug.status = :status', { status: query.status });
    }
    if (query.severity) {
      qb.andWhere('bug.severity = :severity', { severity: query.severity });
    }
    if (query.storyId) {
      qb.andWhere('bug.storyId = :storyId', { storyId: query.storyId });
    }
    if (query.search) {
      qb.andWhere(
        '(bug.title ILIKE :search OR bug.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
  }
}

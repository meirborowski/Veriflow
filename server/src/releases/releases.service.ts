import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository, SelectQueryBuilder } from 'typeorm';
import { Release } from './entities/release.entity';
import { ReleaseStory } from './entities/release-story.entity';
import { ReleaseStoryStep } from './entities/release-story-step.entity';
import { UserStory } from '../user-stories/entities/user-story.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { ReleaseQueryDto } from './dto/release-query.dto';
import { AddStoriesDto } from './dto/add-stories.dto';
import { ReleaseStatus, NotificationType } from '../common/types/enums';
import type { PaginatedResponse } from '../common/types/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

export interface ReleaseListItem {
  id: string;
  name: string;
  status: ReleaseStatus;
  storyCount: number;
  createdAt: Date;
  closedAt: Date | null;
}

@Injectable()
export class ReleasesService {
  private readonly logger = new Logger(ReleasesService.name);

  constructor(
    @InjectRepository(Release)
    private readonly releaseRepository: Repository<Release>,
    @InjectRepository(ReleaseStory)
    private readonly releaseStoryRepository: Repository<ReleaseStory>,
    @InjectRepository(UserStory)
    private readonly storyRepository: Repository<UserStory>,
    @InjectRepository(ProjectMember)
    private readonly memberRepository: Repository<ProjectMember>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(projectId: string, dto: CreateReleaseDto): Promise<Release> {
    const release = this.releaseRepository.create({
      projectId,
      name: dto.name,
    });

    const saved = await this.releaseRepository.save(release);

    this.logger.log(`Release created: id=${saved.id}, project=${projectId}`);

    return saved;
  }

  async findAllByProject(
    projectId: string,
    query: ReleaseQueryDto,
  ): Promise<PaginatedResponse<ReleaseListItem>> {
    const qb = this.releaseRepository
      .createQueryBuilder('release')
      .select([
        'release.id AS id',
        'release.name AS name',
        'release.status AS status',
        'release.createdAt AS "createdAt"',
        'release.closedAt AS "closedAt"',
        `CASE
          WHEN release.status = 'DRAFT' THEN (SELECT COUNT(*)::int FROM release_scoped_stories WHERE "releaseId" = release.id)
          ELSE (SELECT COUNT(*)::int FROM release_stories WHERE "releaseId" = release.id)
        END AS "storyCount"`,
      ])
      .where('release.projectId = :projectId', { projectId });

    this.applyFilters(qb, query);

    const countQb = this.releaseRepository
      .createQueryBuilder('release')
      .where('release.projectId = :projectId', { projectId });

    this.applyFilters(countQb, query);

    const total = await countQb.getCount();

    const allowedSort: Record<string, string> = {
      createdAt: 'release.createdAt',
      name: 'release.name',
      status: 'release.status',
    };
    const sortColumn = allowedSort[query.orderBy ?? ''] ?? 'release.createdAt';
    const sortDir = query.sortDir === 'ASC' ? 'ASC' : 'DESC';

    const data = await qb
      .orderBy(sortColumn, sortDir)
      .offset((query.page - 1) * query.limit)
      .limit(query.limit)
      .getRawMany<ReleaseListItem>();

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

  async findOne(releaseId: string): Promise<Record<string, unknown>> {
    const release = await this.releaseRepository.findOne({
      where: { id: releaseId },
    });

    if (!release) {
      throw new NotFoundException('Release not found');
    }

    if (release.status === ReleaseStatus.DRAFT) {
      const releaseWithScoped = await this.releaseRepository.findOne({
        where: { id: releaseId },
        relations: ['scopedStories', 'scopedStories.steps'],
      });

      const scopedStories = releaseWithScoped?.scopedStories ?? [];

      return {
        id: release.id,
        projectId: release.projectId,
        name: release.name,
        status: release.status,
        createdAt: release.createdAt,
        closedAt: release.closedAt,
        stories: scopedStories.map((story) => ({
          id: story.id,
          title: story.title,
          priority: story.priority,
          status: story.status,
          stepCount: story.steps?.length ?? 0,
        })),
      };
    }

    // Closed: return snapshot stories with steps
    const stories = await this.releaseStoryRepository.find({
      where: { releaseId },
      relations: ['steps'],
      order: { steps: { order: 'ASC' } },
    });

    return {
      id: release.id,
      projectId: release.projectId,
      name: release.name,
      status: release.status,
      createdAt: release.createdAt,
      closedAt: release.closedAt,
      stories: stories.map((story) => ({
        id: story.id,
        sourceStoryId: story.sourceStoryId,
        title: story.title,
        description: story.description,
        priority: story.priority,
        steps: story.steps,
      })),
    };
  }

  async update(releaseId: string, dto: UpdateReleaseDto): Promise<Release> {
    const release = await this.releaseRepository.findOne({
      where: { id: releaseId },
    });

    if (!release) {
      throw new NotFoundException('Release not found');
    }

    if (release.status !== ReleaseStatus.DRAFT) {
      throw new ConflictException('Release is already closed');
    }

    Object.assign(release, dto);
    const saved = await this.releaseRepository.save(release);

    this.logger.log(`Release updated: id=${releaseId}`);

    return saved;
  }

  async remove(releaseId: string): Promise<void> {
    const release = await this.releaseRepository.findOne({
      where: { id: releaseId },
    });

    if (!release) {
      throw new NotFoundException('Release not found');
    }

    if (release.status !== ReleaseStatus.DRAFT) {
      throw new ConflictException('Release is already closed');
    }

    await this.releaseRepository.remove(release);

    this.logger.log(`Release deleted: id=${releaseId}`);
  }

  async close(releaseId: string): Promise<{
    id: string;
    name: string;
    status: ReleaseStatus;
    closedAt: Date;
    storyCount: number;
  }> {
    const closedAt = new Date();

    const result = await this.dataSource.transaction(async (manager) => {
      const releaseRepo = manager.getRepository(Release);
      const releaseStoryRepo = manager.getRepository(ReleaseStory);
      const releaseStepRepo = manager.getRepository(ReleaseStoryStep);

      // Lock the release row to prevent concurrent close attempts
      const release = await releaseRepo.findOne({
        where: { id: releaseId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!release) {
        throw new NotFoundException('Release not found');
      }

      // Load relations separately — FOR UPDATE cannot be used with LEFT JOINs
      const releaseWithStories = await releaseRepo.findOne({
        where: { id: releaseId },
        relations: ['scopedStories', 'scopedStories.steps'],
      });

      if (release.status !== ReleaseStatus.DRAFT) {
        throw new ConflictException('Release is already closed');
      }

      const scopedStories = releaseWithStories!.scopedStories;

      if (scopedStories.length === 0) {
        throw new BadRequestException('Cannot close release with no stories');
      }

      for (const story of scopedStories) {
        const snapshot = releaseStoryRepo.create({
          releaseId,
          sourceStoryId: story.id,
          title: story.title,
          description: story.description,
          priority: story.priority,
        });

        const savedSnapshot = await releaseStoryRepo.save(snapshot);

        if (story.steps && story.steps.length > 0) {
          const stepSnapshots = story.steps.map((step) =>
            releaseStepRepo.create({
              releaseStoryId: savedSnapshot.id,
              order: step.order,
              instruction: step.instruction,
            }),
          );

          await releaseStepRepo.save(stepSnapshots);
        }
      }

      await releaseRepo.update(releaseId, {
        status: ReleaseStatus.CLOSED,
        closedAt,
      });

      return {
        id: release.id,
        name: release.name,
        projectId: release.projectId,
        storyCount: scopedStories.length,
      };
    });

    this.logger.log(
      `Release closed: id=${releaseId}, project=${result.projectId}, stories=${result.storyCount}`,
    );

    // Notify all project members
    const members = await this.memberRepository.find({
      where: { projectId: result.projectId },
      select: ['userId'],
    });

    for (const member of members) {
      const notification = await this.notificationsService.create({
        userId: member.userId,
        type: NotificationType.RELEASE_CLOSED,
        title: 'Release closed',
        message: `Release "${result.name}" has been closed with ${result.storyCount} stories`,
        relatedEntityType: 'release',
        relatedEntityId: releaseId,
      });
      this.notificationsGateway.notifyUser(member.userId, notification);
    }

    return {
      id: result.id,
      name: result.name,
      status: ReleaseStatus.CLOSED,
      closedAt,
      storyCount: result.storyCount,
    };
  }

  async addStories(
    releaseId: string,
    dto: AddStoriesDto,
  ): Promise<{ added: number }> {
    const release = await this.releaseRepository.findOne({
      where: { id: releaseId },
      relations: ['scopedStories'],
    });

    if (!release) {
      throw new NotFoundException('Release not found');
    }

    if (release.status !== ReleaseStatus.DRAFT) {
      throw new ConflictException('Release is already closed');
    }

    // Dedupe storyIds to prevent false "not found" on duplicates
    const uniqueStoryIds = [...new Set(dto.storyIds)];

    // Validate all stories exist and belong to the same project
    const stories = await this.storyRepository.find({
      where: { id: In(uniqueStoryIds) },
      select: ['id', 'projectId'],
    });

    if (stories.length !== uniqueStoryIds.length) {
      const foundIds = stories.map((s) => s.id);
      const missing = uniqueStoryIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(`Stories not found: ${missing.join(', ')}`);
    }

    const crossProject = stories.filter(
      (s) => s.projectId !== release.projectId,
    );
    if (crossProject.length > 0) {
      throw new BadRequestException(
        'All stories must belong to the same project as the release',
      );
    }

    // Filter out already-scoped stories
    const existingIds = release.scopedStories.map((s) => s.id);
    const newStories = stories.filter((s) => !existingIds.includes(s.id));

    if (newStories.length > 0) {
      await this.releaseRepository
        .createQueryBuilder()
        .relation(Release, 'scopedStories')
        .of(releaseId)
        .add(newStories.map((s) => s.id));
    }

    this.logger.log(
      `Stories added to release: release=${releaseId}, added=${newStories.length}`,
    );

    return { added: newStories.length };
  }

  async removeStory(releaseId: string, storyId: string): Promise<void> {
    const release = await this.releaseRepository.findOne({
      where: { id: releaseId },
      relations: ['scopedStories'],
    });

    if (!release) {
      throw new NotFoundException('Release not found');
    }

    if (release.status !== ReleaseStatus.DRAFT) {
      throw new ConflictException('Release is already closed');
    }

    const isScoped = release.scopedStories.some((s) => s.id === storyId);
    if (!isScoped) {
      throw new NotFoundException('Story is not in this release scope');
    }

    await this.releaseRepository
      .createQueryBuilder()
      .relation(Release, 'scopedStories')
      .of(releaseId)
      .remove(storyId);

    this.logger.log(
      `Story removed from release: release=${releaseId}, story=${storyId}`,
    );
  }

  private applyFilters(
    qb: SelectQueryBuilder<Release>,
    query: ReleaseQueryDto,
  ): void {
    if (query.status) {
      qb.andWhere('release.status = :status', { status: query.status });
    }
    if (query.search) {
      qb.andWhere('release.name ILIKE :search', {
        search: `%${query.search}%`,
      });
    }
  }
}

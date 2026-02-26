import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, LessThan } from 'typeorm';
import { TestExecution } from './entities/test-execution.entity';
import { StepResult } from './entities/step-result.entity';
import { Release } from '../releases/entities/release.entity';
import { ReleaseStory } from '../releases/entities/release-story.entity';
import { ReleaseStoryStep } from '../releases/entities/release-story-step.entity';
import { TestStatus, StepStatus, ReleaseStatus } from '../common/types/enums';
import type { PaginatedResponse } from '../common/types/pagination';
import type { ExecutionQueryDto } from './dto/execution-query.dto';
import type { BugReportDto } from './dto/submit-result.dto';

export interface AssignedStory {
  executionId: string;
  releaseStory: {
    id: string;
    title: string;
    description: string;
    priority: string;
    steps: { id: string; order: number; instruction: string }[];
  };
  attempt: number;
}

export interface DashboardSummary {
  total: number;
  untested: number;
  inProgress: number;
  pass: number;
  fail: number;
  partiallyTested: number;
  cantBeTested: number;
}

export interface ExecutionListItem {
  id: string;
  releaseStoryId: string;
  storyTitle: string;
  assignedToUserId: string;
  testerName: string;
  attempt: number;
  status: TestStatus;
  startedAt: Date;
  completedAt: Date | null;
}

export interface LatestExecutionItem {
  releaseStoryId: string;
  storyTitle: string;
  priority: string;
  latestStatus: TestStatus;
  latestExecutionId: string | null;
  attempt: number;
}

const ORPHAN_THRESHOLD_MS = 2 * 60 * 1000;

@Injectable()
export class TestExecutionService implements OnModuleInit {
  private readonly logger = new Logger(TestExecutionService.name);

  constructor(
    @InjectRepository(TestExecution)
    private readonly executionRepository: Repository<TestExecution>,
    @InjectRepository(StepResult)
    private readonly stepResultRepository: Repository<StepResult>,
    @InjectRepository(Release)
    private readonly releaseRepository: Repository<Release>,
    @InjectRepository(ReleaseStory)
    private readonly releaseStoryRepository: Repository<ReleaseStory>,
    @InjectRepository(ReleaseStoryStep)
    private readonly releaseStoryStepRepository: Repository<ReleaseStoryStep>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    const cutoff = new Date(Date.now() - ORPHAN_THRESHOLD_MS);
    const result = await this.executionRepository.delete({
      status: TestStatus.IN_PROGRESS,
      startedAt: LessThan(cutoff),
    });

    if (result.affected && result.affected > 0) {
      this.logger.log(
        `Cleaned up ${result.affected} orphaned IN_PROGRESS executions`,
      );
    }
  }

  async assignStory(
    releaseId: string,
    userId: string,
  ): Promise<AssignedStory | null> {
    return this.dataSource.transaction(async (manager) => {
      const executionRepo = manager.getRepository(TestExecution);

      // Verify release is CLOSED
      const release = await manager.getRepository(Release).findOne({
        where: { id: releaseId },
        select: ['id', 'status'],
      });

      if (!release) {
        throw new NotFoundException('Release not found');
      }

      if (release.status !== ReleaseStatus.CLOSED) {
        throw new ConflictException('Release must be CLOSED to run tests');
      }

      // Check user doesn't already have an IN_PROGRESS execution for this release
      const existing = await executionRepo.findOne({
        where: {
          releaseId,
          assignedToUserId: userId,
          status: TestStatus.IN_PROGRESS,
        },
      });

      if (existing) {
        throw new ConflictException(
          'You already have an in-progress execution for this release',
        );
      }

      // Find next available story using FOR UPDATE SKIP LOCKED
      // A story is available if it has no IN_PROGRESS, PASS, or CANT_BE_TESTED execution
      const nextStory = await manager
        .createQueryBuilder(ReleaseStory, 'rs')
        .setLock('pessimistic_partial_write')
        .where('rs.releaseId = :releaseId', { releaseId })
        .andWhere(
          `rs.id NOT IN (
            SELECT te."releaseStoryId" FROM test_executions te
            WHERE te."releaseId" = :releaseId
            AND te.status IN (:...excludedStatuses)
          )`,
          {
            releaseId,
            excludedStatuses: [
              TestStatus.IN_PROGRESS,
              TestStatus.PASS,
              TestStatus.CANT_BE_TESTED,
            ],
          },
        )
        .orderBy(
          `CASE rs.priority
            WHEN 'CRITICAL' THEN 1
            WHEN 'HIGH' THEN 2
            WHEN 'MEDIUM' THEN 3
            WHEN 'LOW' THEN 4
          END`,
          'ASC',
        )
        .getOne();

      if (!nextStory) {
        return null;
      }

      // Count previous attempts for this story
      const previousAttempts = await executionRepo.count({
        where: { releaseStoryId: nextStory.id },
      });

      // Create execution
      const execution = executionRepo.create({
        releaseId,
        releaseStoryId: nextStory.id,
        assignedToUserId: userId,
        attempt: previousAttempts + 1,
        status: TestStatus.IN_PROGRESS,
      });

      const saved = await executionRepo.save(execution);

      // Load steps
      const steps = await manager.getRepository(ReleaseStoryStep).find({
        where: { releaseStoryId: nextStory.id },
        order: { order: 'ASC' },
      });

      this.logger.log(
        `Story assigned: execution=${saved.id}, story=${nextStory.id}, user=${userId}`,
      );

      return {
        executionId: saved.id,
        releaseStory: {
          id: nextStory.id,
          title: nextStory.title,
          description: nextStory.description,
          priority: nextStory.priority,
          steps: steps.map((s) => ({
            id: s.id,
            order: s.order,
            instruction: s.instruction,
          })),
        },
        attempt: saved.attempt,
      };
    });
  }

  async updateStep(
    executionId: string,
    stepId: string,
    status: StepStatus,
    comment: string | null,
    userId: string,
  ): Promise<StepResult> {
    const execution = await this.executionRepository.findOne({
      where: { id: executionId },
    });

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    if (execution.assignedToUserId !== userId) {
      throw new ForbiddenException('Not your execution');
    }

    if (execution.status !== TestStatus.IN_PROGRESS) {
      throw new ConflictException('Execution is not in progress');
    }

    // Verify step belongs to the execution's story
    const step = await this.releaseStoryStepRepository.findOne({
      where: { id: stepId, releaseStoryId: execution.releaseStoryId },
    });

    if (!step) {
      throw new NotFoundException('Step not found for this execution');
    }

    // Upsert step result
    const existing = await this.stepResultRepository.findOne({
      where: { executionId, releaseStoryStepId: stepId },
    });

    if (existing) {
      existing.status = status;
      existing.comment = comment ?? null;
      return this.stepResultRepository.save(existing);
    }

    const stepResult = this.stepResultRepository.create({
      executionId,
      releaseStoryStepId: stepId,
      status,
      comment: comment ?? null,
    });

    return this.stepResultRepository.save(stepResult);
  }

  async submitResult(
    executionId: string,
    status: TestStatus,
    comment: string | null,
    userId: string,
    // Bug creation deferred to Phase 4
    bugPayload?: BugReportDto, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<TestExecution> {
    const execution = await this.executionRepository.findOne({
      where: { id: executionId },
    });

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    if (execution.assignedToUserId !== userId) {
      throw new ForbiddenException('Not your execution');
    }

    if (execution.status !== TestStatus.IN_PROGRESS) {
      throw new ConflictException('Execution is not in progress');
    }

    // Only final verdicts are allowed
    const validStatuses = [
      TestStatus.PASS,
      TestStatus.FAIL,
      TestStatus.PARTIALLY_TESTED,
      TestStatus.CANT_BE_TESTED,
    ];
    if (!validStatuses.includes(status)) {
      throw new ConflictException(
        'Invalid final status. Must be PASS, FAIL, PARTIALLY_TESTED, or CANT_BE_TESTED',
      );
    }

    execution.status = status;
    execution.comment = comment ?? null;
    execution.completedAt = new Date();

    const saved = await this.executionRepository.save(execution);

    this.logger.log(
      `Execution completed: id=${executionId}, status=${status}, user=${userId}`,
    );

    // Bug creation deferred to Phase 4

    return saved;
  }

  async cleanupTester(
    releaseId: string,
    userId: string,
  ): Promise<string | null> {
    const execution = await this.executionRepository.findOne({
      where: {
        releaseId,
        assignedToUserId: userId,
        status: TestStatus.IN_PROGRESS,
      },
    });

    if (!execution) {
      return null;
    }

    const storyId = execution.releaseStoryId;

    // Hard-delete the incomplete execution and its step results
    await this.executionRepository.remove(execution);

    this.logger.log(
      `Tester cleanup: user=${userId}, release=${releaseId}, story=${storyId}`,
    );

    return storyId;
  }

  async findAllByRelease(
    releaseId: string,
    query: ExecutionQueryDto,
  ): Promise<PaginatedResponse<ExecutionListItem>> {
    const qb = this.executionRepository
      .createQueryBuilder('te')
      .select([
        'te.id AS id',
        'te.releaseStoryId AS "releaseStoryId"',
        'rs.title AS "storyTitle"',
        'te.assignedToUserId AS "assignedToUserId"',
        'u.name AS "testerName"',
        'te.attempt AS attempt',
        'te.status AS status',
        'te.startedAt AS "startedAt"',
        'te.completedAt AS "completedAt"',
      ])
      .innerJoin('release_stories', 'rs', 'rs.id = te.releaseStoryId')
      .innerJoin('users', 'u', 'u.id = te.assignedToUserId')
      .where('te.releaseId = :releaseId', { releaseId });

    if (query.storyId) {
      qb.andWhere('te.releaseStoryId = :storyId', { storyId: query.storyId });
    }

    if (query.status) {
      qb.andWhere('te.status = :status', { status: query.status });
    }

    const countQb = this.executionRepository
      .createQueryBuilder('te')
      .where('te.releaseId = :releaseId', { releaseId });

    if (query.storyId) {
      countQb.andWhere('te.releaseStoryId = :storyId', {
        storyId: query.storyId,
      });
    }

    if (query.status) {
      countQb.andWhere('te.status = :status', { status: query.status });
    }

    const total = await countQb.getCount();

    const data = await qb
      .orderBy('te.startedAt', 'DESC')
      .offset((query.page - 1) * query.limit)
      .limit(query.limit)
      .getRawMany<ExecutionListItem>();

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

  async findLatestByRelease(releaseId: string): Promise<{
    stories: LatestExecutionItem[];
    summary: DashboardSummary;
  }> {
    // Get all stories for the release
    const releaseStories = await this.releaseStoryRepository.find({
      where: { releaseId },
      order: {
        priority: 'ASC',
      },
    });

    // Get latest completed execution per story
    const latestExecutions = await this.executionRepository
      .createQueryBuilder('te')
      .select([
        'te.releaseStoryId AS "releaseStoryId"',
        'te.id AS id',
        'te.status AS status',
        'te.attempt AS attempt',
      ])
      .where('te.releaseId = :releaseId', { releaseId })
      .andWhere('te.status != :inProgress', {
        inProgress: TestStatus.IN_PROGRESS,
      })
      .andWhere(
        `te.id = (
          SELECT te2.id FROM test_executions te2
          WHERE te2."releaseStoryId" = te."releaseStoryId"
          AND te2.status != :inProgress
          ORDER BY te2.attempt DESC
          LIMIT 1
        )`,
        { inProgress: TestStatus.IN_PROGRESS },
      )
      .getRawMany<{
        releaseStoryId: string;
        id: string;
        status: TestStatus;
        attempt: number;
      }>();

    const latestMap = new Map(
      latestExecutions.map((e) => [e.releaseStoryId, e]),
    );

    // Check for IN_PROGRESS executions
    const inProgressExecutions = await this.executionRepository.find({
      where: { releaseId, status: TestStatus.IN_PROGRESS },
      select: ['releaseStoryId'],
    });
    const inProgressStoryIds = new Set(
      inProgressExecutions.map((e) => e.releaseStoryId),
    );

    const stories: LatestExecutionItem[] = releaseStories.map((rs) => {
      const latest = latestMap.get(rs.id);
      let latestStatus = TestStatus.UNTESTED;
      if (latest) {
        latestStatus = latest.status;
      } else if (inProgressStoryIds.has(rs.id)) {
        latestStatus = TestStatus.IN_PROGRESS;
      }

      return {
        releaseStoryId: rs.id,
        storyTitle: rs.title,
        priority: rs.priority,
        latestStatus,
        latestExecutionId: latest?.id ?? null,
        attempt: latest?.attempt ?? 0,
      };
    });

    const summary = this.computeSummary(stories);

    return { stories, summary };
  }

  async findOne(executionId: string): Promise<
    TestExecution & {
      storyTitle: string;
      testerName: string;
    }
  > {
    const execution = await this.executionRepository.findOne({
      where: { id: executionId },
      relations: ['stepResults', 'releaseStory', 'assignedToUser'],
    });

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    return Object.assign(execution, {
      storyTitle: execution.releaseStory?.title ?? '',
      testerName: execution.assignedToUser?.name ?? '',
    });
  }

  async getDashboardSummary(releaseId: string): Promise<DashboardSummary> {
    const { summary } = await this.findLatestByRelease(releaseId);
    return summary;
  }

  private computeSummary(stories: LatestExecutionItem[]): DashboardSummary {
    const summary: DashboardSummary = {
      total: stories.length,
      untested: 0,
      inProgress: 0,
      pass: 0,
      fail: 0,
      partiallyTested: 0,
      cantBeTested: 0,
    };

    for (const story of stories) {
      switch (story.latestStatus) {
        case TestStatus.UNTESTED:
          summary.untested++;
          break;
        case TestStatus.IN_PROGRESS:
          summary.inProgress++;
          break;
        case TestStatus.PASS:
          summary.pass++;
          break;
        case TestStatus.FAIL:
          summary.fail++;
          break;
        case TestStatus.PARTIALLY_TESTED:
          summary.partiallyTested++;
          break;
        case TestStatus.CANT_BE_TESTED:
          summary.cantBeTested++;
          break;
      }
    }

    return summary;
  }
}

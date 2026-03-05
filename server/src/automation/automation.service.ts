import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RunSpawnerService } from './run-spawner.service';
import { PlaywrightTest } from './entities/playwright-test.entity';
import { StoryTestLink } from './entities/story-test-link.entity';
import { AutomationRun } from './entities/automation-run.entity';
import { ProjectRepoConfig } from './entities/project-repo-config.entity';
import { UserStory } from '../user-stories/entities/user-story.entity';
import { SyncRegistryDto } from './dto/sync-registry.dto';
import { LinkTestsDto } from './dto/link-tests.dto';
import { ReportRunDto } from './dto/report-run.dto';
import { TriggerRunDto } from './dto/trigger-run.dto';
import { UpsertRepoConfigDto } from './dto/upsert-repo-config.dto';
import { AutomationQueryDto } from './dto/automation-query.dto';
import { UpdateRunStatusDto } from './dto/update-run-status.dto';
import {
  AutomationRunStatus,
  AutomationTrigger,
  LinkSource,
  type TestStatus,
} from '../common/types/enums';
import { encrypt, decrypt } from '../common/utils/crypto.util';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    @InjectRepository(PlaywrightTest)
    private readonly testRepository: Repository<PlaywrightTest>,
    @InjectRepository(StoryTestLink)
    private readonly linkRepository: Repository<StoryTestLink>,
    @InjectRepository(AutomationRun)
    private readonly runRepository: Repository<AutomationRun>,
    @InjectRepository(ProjectRepoConfig)
    private readonly configRepository: Repository<ProjectRepoConfig>,
    @InjectRepository(UserStory)
    private readonly storyRepository: Repository<UserStory>,
    private readonly runSpawner: RunSpawnerService,
    private readonly configService: ConfigService,
  ) {}

  async registrySync(
    projectId: string,
    dto: SyncRegistryDto,
  ): Promise<{ created: number; updated: number; deleted: number }> {
    const now = new Date();
    const incomingIds = dto.tests.map((t) => t.externalId);

    const existing = await this.testRepository.find({ where: { projectId } });
    const existingMap = new Map(existing.map((t) => [t.externalId, t]));

    let created = 0;
    let updated = 0;

    for (const item of dto.tests) {
      const existing = existingMap.get(item.externalId);
      if (existing) {
        existing.testFile = item.testFile;
        existing.testName = item.testName;
        existing.tags = item.tags ?? [];
        existing.lastSyncedAt = now;
        await this.testRepository.save(existing);
        updated++;
      } else {
        const test = this.testRepository.create({
          projectId,
          externalId: item.externalId,
          testFile: item.testFile,
          testName: item.testName,
          tags: item.tags ?? [],
          lastSyncedAt: now,
        });
        await this.testRepository.save(test);
        created++;
      }
    }

    // Delete tests that are no longer in the incoming registry
    const toDelete = existing.filter(
      (t) => !incomingIds.includes(t.externalId),
    );
    let deleted = 0;
    if (toDelete.length > 0) {
      await this.testRepository.remove(toDelete);
      deleted = toDelete.length;
    }

    this.logger.log(
      `Registry sync for project ${projectId}: created=${created}, updated=${updated}, deleted=${deleted}`,
    );

    return { created, updated, deleted };
  }

  async listTests(
    projectId: string,
    query: AutomationQueryDto,
  ): Promise<{
    data: PlaywrightTest[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(Number(query.limit), 100) : 20;
    const skip = (page - 1) * limit;

    const qb = this.testRepository
      .createQueryBuilder('test')
      .where('test.projectId = :projectId', { projectId });

    if (query.search) {
      qb.andWhere(
        '(test.testName ILIKE :search OR test.testFile ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.tags) {
      const tagList = query.tags.split(',').map((t) => t.trim());
      qb.andWhere('test.tags && :tags', { tags: tagList });
    }

    if (query.linkedStoryId) {
      qb.innerJoin(
        'story_test_links',
        'link',
        'link."testId" = test.id AND link."storyId" = :storyId',
        { storyId: query.linkedStoryId },
      );
    }

    const [data, total] = await qb
      .orderBy('test.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getTest(id: string): Promise<{
    test: PlaywrightTest;
    linkedStories: UserStory[];
    recentRuns: AutomationRun[];
  }> {
    const test = await this.testRepository.findOne({ where: { id } });
    if (!test) throw new NotFoundException('Playwright test not found');

    const links = await this.linkRepository.find({
      where: { testId: id },
      relations: ['story'],
    });
    const linkedStories = links.map((l) => l.story);

    const recentRuns = await this.runRepository.find({
      where: { testId: id },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return { test, linkedStories, recentRuns };
  }

  async deleteTest(id: string): Promise<void> {
    const test = await this.testRepository.findOne({ where: { id } });
    if (!test) throw new NotFoundException('Playwright test not found');
    await this.testRepository.remove(test);
    this.logger.log(`Deleted playwright test ${id}`);
  }

  async linkTests(
    storyId: string,
    dto: LinkTestsDto,
  ): Promise<StoryTestLink[]> {
    const story = await this.storyRepository.findOne({
      where: { id: storyId },
    });
    if (!story) throw new NotFoundException('Story not found');

    const tests = await this.testRepository.find({
      where: { id: In(dto.testIds) },
    });
    if (tests.length !== dto.testIds.length) {
      throw new NotFoundException('One or more tests not found');
    }

    const links: StoryTestLink[] = [];
    for (const test of tests) {
      const existing = await this.linkRepository.findOne({
        where: { storyId, testId: test.id },
      });
      if (!existing) {
        const link = this.linkRepository.create({
          storyId,
          testId: test.id,
          linkedBy: LinkSource.USER,
        });
        links.push(await this.linkRepository.save(link));
      } else {
        links.push(existing);
      }
    }

    this.logger.log(`Linked ${links.length} test(s) to story ${storyId}`);
    return links;
  }

  async unlinkTest(storyId: string, testId: string): Promise<void> {
    const link = await this.linkRepository.findOne({
      where: { storyId, testId },
    });
    if (!link) throw new NotFoundException('Link not found');
    await this.linkRepository.remove(link);
    this.logger.log(`Unlinked test ${testId} from story ${storyId}`);
  }

  async getAutomationSummary(storyId: string): Promise<{
    tests: Array<{
      test: PlaywrightTest;
      latestRunStatus: AutomationRunStatus | null;
    }>;
    latestManualStatus: TestStatus | null;
    hasConflict: boolean;
  }> {
    const story = await this.storyRepository.findOne({
      where: { id: storyId },
    });
    if (!story) throw new NotFoundException('Story not found');

    const links = await this.linkRepository.find({
      where: { storyId },
      relations: ['test'],
    });

    const terminalStatuses: AutomationRunStatus[] = [
      AutomationRunStatus.PASS,
      AutomationRunStatus.FAIL,
      AutomationRunStatus.ERROR,
      AutomationRunStatus.TIMEOUT,
    ];

    const testsWithStatus = await Promise.all(
      links.map(async (link) => {
        const latestRun = await this.runRepository.findOne({
          where: {
            testId: link.testId,
            status: In(terminalStatuses),
          },
          order: { completedAt: 'DESC' },
        });
        return {
          test: link.test,
          latestRunStatus: latestRun?.status ?? null,
        };
      }),
    );

    // Manual status resolution requires traversing Release → ReleaseStory → TestExecution
    // which needs the releaseId context. Return null here; callers can enrich as needed.
    const latestManualStatus: TestStatus | null = null;

    // Conflict: if any automation run has PASS or FAIL AND manual has a terminal
    // opposite verdict. Since we can't easily get manual status here without
    // the full release/execution chain, we focus on automation-only conflict
    // detection (multiple tests disagree with each other).
    const automationPasses = testsWithStatus.filter(
      (t) => t.latestRunStatus === AutomationRunStatus.PASS,
    );
    const automationFails = testsWithStatus.filter(
      (t) => t.latestRunStatus === AutomationRunStatus.FAIL,
    );
    const hasConflict =
      automationPasses.length > 0 && automationFails.length > 0;

    return { tests: testsWithStatus, latestManualStatus, hasConflict };
  }

  async triggerRun(
    projectId: string,
    dto: TriggerRunDto,
  ): Promise<{ runIds: string[] }> {
    const repoConfig = await this.configRepository.findOne({
      where: { projectId },
    });
    if (!repoConfig) {
      throw new BadRequestException(
        'Repository configuration not found for this project. Please configure it first.',
      );
    }

    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');

    let testsToRun: PlaywrightTest[];
    if (dto.testIds && dto.testIds.length > 0) {
      testsToRun = await this.testRepository.find({
        where: { id: In(dto.testIds), projectId },
      });
      if (testsToRun.length === 0) {
        throw new NotFoundException('No matching tests found');
      }
    } else {
      testsToRun = await this.testRepository.find({ where: { projectId } });
      if (testsToRun.length === 0) {
        throw new NotFoundException('No tests registered for this project');
      }
    }

    const runIds: string[] = [];
    for (const test of testsToRun) {
      const run = this.runRepository.create({
        projectId,
        testId: test.id,
        releaseId: dto.releaseId ?? null,
        status: AutomationRunStatus.QUEUED,
        triggeredBy: AutomationTrigger.UI,
        startedAt: new Date(),
      });
      const savedRun = await this.runRepository.save(run);
      runIds.push(savedRun.id);

      if (repoConfig.authToken && !encryptionKey) {
        this.logger.error(
          `ENCRYPTION_KEY is not set but project ${projectId} has a stored auth token. ` +
            `Runs requiring repo authentication will fail. Set ENCRYPTION_KEY in the server environment.`,
        );
      }
      const decryptedToken =
        repoConfig.authToken && encryptionKey
          ? decrypt(repoConfig.authToken, encryptionKey)
          : null;

      try {
        await this.runSpawner.spawn({
          runId: savedRun.id,
          repoUrl: repoConfig.repoUrl,
          branch: repoConfig.branch,
          testDirectory: repoConfig.testDirectory,
          playwrightConfig: repoConfig.playwrightConfig,
          testFile: test.testFile,
          testName: test.testName,
          baseUrl: dto.baseUrl,
          authToken: decryptedToken,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to spawn run ${savedRun.id}: ${message}`);
        savedRun.status = AutomationRunStatus.ERROR;
        savedRun.errorMessage = message;
        savedRun.completedAt = new Date();
        await this.runRepository.save(savedRun);
      }
    }

    this.logger.log(
      `Triggered ${runIds.length} automation run(s) for project ${projectId}`,
    );

    return { runIds };
  }

  async reportRun(
    projectId: string,
    dto: ReportRunDto,
  ): Promise<AutomationRun> {
    const test = await this.testRepository.findOne({
      where: { id: dto.testId, projectId },
    });
    if (!test) throw new NotFoundException('Test not found in this project');

    let run: AutomationRun | null = null;

    if (dto.externalRunId) {
      run = await this.runRepository.findOne({
        where: { externalRunId: dto.externalRunId, projectId },
      });
    }

    if (run) {
      run.status = dto.status;
      if (dto.duration !== undefined) run.duration = dto.duration;
      if (dto.completedAt) run.completedAt = new Date(dto.completedAt);
      if (dto.errorMessage !== undefined) run.errorMessage = dto.errorMessage;
      if (dto.logs !== undefined) run.logs = dto.logs;
    } else {
      run = this.runRepository.create({
        projectId,
        testId: dto.testId,
        releaseId: dto.releaseId ?? null,
        status: dto.status,
        triggeredBy: AutomationTrigger.CI_CD,
        duration: dto.duration ?? null,
        startedAt: new Date(dto.startedAt),
        completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
        errorMessage: dto.errorMessage ?? null,
        logs: dto.logs ?? null,
        externalRunId: dto.externalRunId ?? null,
      });
    }

    const saved = await this.runRepository.save(run);
    this.logger.log(
      `Run reported for project ${projectId}, test ${dto.testId}: ${dto.status}`,
    );
    return saved;
  }

  async listRuns(
    projectId: string,
    query: AutomationQueryDto,
  ): Promise<{
    data: AutomationRun[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(Number(query.limit), 100) : 20;
    const skip = (page - 1) * limit;

    const qb = this.runRepository
      .createQueryBuilder('run')
      .where('run.projectId = :projectId', { projectId });

    if (query.testId) {
      qb.andWhere('run.testId = :testId', { testId: query.testId });
    }

    if (query.status) {
      qb.andWhere('run.status = :status', { status: query.status });
    }

    if (query.releaseId) {
      qb.andWhere('run.releaseId = :releaseId', { releaseId: query.releaseId });
    }

    const [data, total] = await qb
      .orderBy('run.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getRun(id: string): Promise<AutomationRun> {
    const run = await this.runRepository.findOne({
      where: { id },
      relations: ['test'],
    });
    if (!run) throw new NotFoundException('Automation run not found');
    return run;
  }

  async getRunStatus(id: string): Promise<{ status: AutomationRunStatus }> {
    const run = await this.runRepository.findOne({
      where: { id },
      select: ['id', 'status'],
    });
    if (!run) throw new NotFoundException('Automation run not found');
    return { status: run.status };
  }

  async updateRunStatus(
    id: string,
    dto: UpdateRunStatusDto,
  ): Promise<AutomationRun> {
    const run = await this.runRepository.findOne({ where: { id } });
    if (!run) throw new NotFoundException('Automation run not found');

    run.status = dto.status;
    if (dto.duration !== undefined) run.duration = dto.duration;
    if (dto.completedAt) run.completedAt = new Date(dto.completedAt);
    if (dto.errorMessage !== undefined) run.errorMessage = dto.errorMessage;
    if (dto.logs !== undefined) run.logs = dto.logs;

    return this.runRepository.save(run);
  }

  async getRepoConfig(projectId: string): Promise<ProjectRepoConfig> {
    const config = await this.configRepository.findOne({
      where: { projectId },
    });
    if (!config)
      throw new NotFoundException('Repository configuration not found');

    // Mask auth token
    if (config.authToken) {
      config.authToken = '***';
    }

    return config;
  }

  async upsertRepoConfig(
    projectId: string,
    dto: UpsertRepoConfigDto,
  ): Promise<ProjectRepoConfig> {
    let config = await this.configRepository.findOne({ where: { projectId } });

    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');

    let encryptedToken: string | null = null;
    if (dto.authToken !== undefined) {
      encryptedToken =
        dto.authToken && encryptionKey
          ? encrypt(dto.authToken, encryptionKey)
          : null;
    } else if (config?.authToken) {
      encryptedToken = config.authToken;
    }

    if (config) {
      config.repoUrl = dto.repoUrl;
      if (dto.branch !== undefined) config.branch = dto.branch;
      if (dto.testDirectory !== undefined)
        config.testDirectory = dto.testDirectory;
      if (dto.playwrightConfig !== undefined)
        config.playwrightConfig = dto.playwrightConfig;
      config.authToken = encryptedToken;
    } else {
      config = this.configRepository.create({
        projectId,
        repoUrl: dto.repoUrl,
        branch: dto.branch ?? 'main',
        testDirectory: dto.testDirectory ?? 'tests',
        playwrightConfig: dto.playwrightConfig ?? null,
        authToken: encryptedToken,
      });
    }

    const saved = await this.configRepository.save(config);
    this.logger.log(`Upserted repo config for project ${projectId}`);

    // Return masked version
    const result = { ...saved };
    if (result.authToken) result.authToken = '***';
    return result;
  }
}

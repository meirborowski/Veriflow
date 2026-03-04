import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AutomationService } from './automation.service';
import { RunSpawnerService } from './run-spawner.service';
import { PlaywrightTest } from './entities/playwright-test.entity';
import { StoryTestLink } from './entities/story-test-link.entity';
import { AutomationRun } from './entities/automation-run.entity';
import { ProjectRepoConfig } from './entities/project-repo-config.entity';
import { UserStory } from '../user-stories/entities/user-story.entity';
import {
  AutomationRunStatus,
  AutomationTrigger,
  LinkSource,
} from '../common/types/enums';
import { encrypt, generateKey } from '../common/utils/crypto.util';

describe('AutomationService', () => {
  let service: AutomationService;

  const mockTestRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const mockLinkRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
  const mockRunRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const mockConfigRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const mockStoryRepo = {
    findOne: jest.fn(),
  };
  const mockRunSpawner = {
    spawn: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationService,
        { provide: getRepositoryToken(PlaywrightTest), useValue: mockTestRepo },
        { provide: getRepositoryToken(StoryTestLink), useValue: mockLinkRepo },
        { provide: getRepositoryToken(AutomationRun), useValue: mockRunRepo },
        {
          provide: getRepositoryToken(ProjectRepoConfig),
          useValue: mockConfigRepo,
        },
        { provide: getRepositoryToken(UserStory), useValue: mockStoryRepo },
        { provide: RunSpawnerService, useValue: mockRunSpawner },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AutomationService>(AutomationService);
    jest.clearAllMocks();
  });

  describe('registrySync', () => {
    it('should create new tests and return counts', async () => {
      mockTestRepo.find.mockResolvedValue([]);
      const created = { id: 'test-1', externalId: 'ext-1' };
      mockTestRepo.create.mockReturnValue(created);
      mockTestRepo.save.mockResolvedValue(created);

      const result = await service.registrySync('proj-1', {
        tests: [
          {
            externalId: 'ext-1',
            testFile: 'tests/a.spec.ts',
            testName: 'Test A',
          },
        ],
      });

      expect(result).toEqual({ created: 1, updated: 0, deleted: 0 });
    });

    it('should update existing tests', async () => {
      const existing = {
        id: 'test-1',
        externalId: 'ext-1',
        testFile: 'old.spec.ts',
        testName: 'Old',
        tags: [],
        lastSyncedAt: null,
      };
      mockTestRepo.find.mockResolvedValue([existing]);
      mockTestRepo.save.mockResolvedValue(existing);

      const result = await service.registrySync('proj-1', {
        tests: [
          {
            externalId: 'ext-1',
            testFile: 'tests/new.spec.ts',
            testName: 'New Name',
            tags: ['smoke'],
          },
        ],
      });

      expect(result).toEqual({ created: 0, updated: 1, deleted: 0 });
      expect(existing.testFile).toBe('tests/new.spec.ts');
      expect(existing.tags).toEqual(['smoke']);
    });

    it('should delete tests not in incoming registry', async () => {
      const old = { id: 'test-old', externalId: 'old-ext' };
      mockTestRepo.find.mockResolvedValue([old]);
      mockTestRepo.save.mockResolvedValue({});
      mockTestRepo.remove.mockResolvedValue(undefined);

      const result = await service.registrySync('proj-1', {
        tests: [
          { externalId: 'new-ext', testFile: 'new.spec.ts', testName: 'New' },
        ],
      });

      expect(result.deleted).toBe(1);
      expect(mockTestRepo.remove).toHaveBeenCalledWith([old]);
    });
  });

  describe('getTest', () => {
    it('should return test with linked stories and recent runs', async () => {
      const test = { id: 'test-1', projectId: 'proj-1' };
      mockTestRepo.findOne.mockResolvedValue(test);
      mockLinkRepo.find.mockResolvedValue([
        { testId: 'test-1', story: { id: 'story-1' } },
      ]);
      mockRunRepo.find.mockResolvedValue([{ id: 'run-1' }]);

      const result = await service.getTest('test-1');

      expect(result.test).toEqual(test);
      expect(result.linkedStories).toHaveLength(1);
      expect(result.recentRuns).toHaveLength(1);
    });

    it('should throw NotFoundException if test not found', async () => {
      mockTestRepo.findOne.mockResolvedValue(null);
      await expect(service.getTest('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteTest', () => {
    it('should remove a test', async () => {
      const test = { id: 'test-1' };
      mockTestRepo.findOne.mockResolvedValue(test);
      mockTestRepo.remove.mockResolvedValue(undefined);

      await service.deleteTest('test-1');
      expect(mockTestRepo.remove).toHaveBeenCalledWith(test);
    });

    it('should throw NotFoundException if test not found', async () => {
      mockTestRepo.findOne.mockResolvedValue(null);
      await expect(service.deleteTest('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('linkTests', () => {
    it('should create links for each test', async () => {
      mockStoryRepo.findOne.mockResolvedValue({ id: 'story-1' });
      mockTestRepo.find.mockResolvedValue([{ id: 'test-1' }, { id: 'test-2' }]);
      mockLinkRepo.findOne.mockResolvedValue(null);
      const linkObj = { id: 'link-1' };
      mockLinkRepo.create.mockReturnValue(linkObj);
      mockLinkRepo.save.mockResolvedValue(linkObj);

      const result = await service.linkTests('story-1', {
        testIds: ['test-1', 'test-2'],
      });

      expect(result).toHaveLength(2);
      expect(mockLinkRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ linkedBy: LinkSource.USER }),
      );
    });

    it('should skip already-linked tests', async () => {
      mockStoryRepo.findOne.mockResolvedValue({ id: 'story-1' });
      mockTestRepo.find.mockResolvedValue([{ id: 'test-1' }]);
      const existing = { id: 'link-1', storyId: 'story-1', testId: 'test-1' };
      mockLinkRepo.findOne.mockResolvedValue(existing);

      const result = await service.linkTests('story-1', {
        testIds: ['test-1'],
      });

      expect(result).toHaveLength(1);
      expect(mockLinkRepo.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if story not found', async () => {
      mockStoryRepo.findOne.mockResolvedValue(null);
      await expect(
        service.linkTests('missing', { testIds: ['t-1'] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if any test not found', async () => {
      mockStoryRepo.findOne.mockResolvedValue({ id: 'story-1' });
      mockTestRepo.find.mockResolvedValue([]); // empty — tests not found
      await expect(
        service.linkTests('story-1', { testIds: ['missing'] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('unlinkTest', () => {
    it('should remove the link', async () => {
      const link = { id: 'link-1' };
      mockLinkRepo.findOne.mockResolvedValue(link);
      mockLinkRepo.remove.mockResolvedValue(undefined);

      await service.unlinkTest('story-1', 'test-1');
      expect(mockLinkRepo.remove).toHaveBeenCalledWith(link);
    });

    it('should throw NotFoundException if link not found', async () => {
      mockLinkRepo.findOne.mockResolvedValue(null);
      await expect(service.unlinkTest('story-1', 'test-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAutomationSummary', () => {
    it('should return summary with no conflict when all tests pass', async () => {
      mockStoryRepo.findOne.mockResolvedValue({ id: 'story-1' });
      mockLinkRepo.find.mockResolvedValue([
        { testId: 'test-1', test: { id: 'test-1', testName: 'Test A' } },
      ]);
      mockRunRepo.findOne.mockResolvedValue({
        status: AutomationRunStatus.PASS,
      });

      const result = await service.getAutomationSummary('story-1');

      expect(result.hasConflict).toBe(false);
      expect(result.tests[0].latestRunStatus).toBe(AutomationRunStatus.PASS);
    });

    it('should detect conflict when mixed pass/fail results', async () => {
      mockStoryRepo.findOne.mockResolvedValue({ id: 'story-1' });
      mockLinkRepo.find.mockResolvedValue([
        { testId: 'test-1', test: { id: 'test-1' } },
        { testId: 'test-2', test: { id: 'test-2' } },
      ]);
      mockRunRepo.findOne
        .mockResolvedValueOnce({ status: AutomationRunStatus.PASS })
        .mockResolvedValueOnce({ status: AutomationRunStatus.FAIL });

      const result = await service.getAutomationSummary('story-1');

      expect(result.hasConflict).toBe(true);
    });

    it('should throw NotFoundException if story not found', async () => {
      mockStoryRepo.findOne.mockResolvedValue(null);
      await expect(service.getAutomationSummary('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('triggerRun', () => {
    it('should create runs and spawn pods', async () => {
      const encKey = generateKey();
      mockConfigService.get.mockReturnValue(encKey);

      mockConfigRepo.findOne.mockResolvedValue({
        repoUrl: 'https://github.com/org/repo',
        branch: 'main',
        testDirectory: 'tests',
        playwrightConfig: null,
        authToken: encrypt('ghp_token', encKey),
      });

      mockTestRepo.find.mockResolvedValue([
        {
          id: 'test-1',
          testFile: 'tests/a.spec.ts',
          testName: 'Test A',
          projectId: 'proj-1',
        },
      ]);

      const run = { id: 'run-1' };
      mockRunRepo.create.mockReturnValue(run);
      mockRunRepo.save.mockResolvedValue(run);
      mockRunSpawner.spawn.mockResolvedValue(undefined);

      const result = await service.triggerRun('proj-1', {
        baseUrl: 'http://localhost:3000',
      });

      expect(result.runIds).toEqual(['run-1']);
      expect(mockRunSpawner.spawn).toHaveBeenCalledWith(
        expect.objectContaining({
          runId: 'run-1',
          baseUrl: 'http://localhost:3000',
        }),
      );
    });

    it('should mark run as ERROR and not throw when spawn fails', async () => {
      mockConfigService.get.mockReturnValue(null);
      mockConfigRepo.findOne.mockResolvedValue({
        repoUrl: 'https://github.com/org/repo',
        branch: 'main',
        testDirectory: 'tests',
        playwrightConfig: null,
        authToken: null,
      });
      mockTestRepo.find.mockResolvedValue([
        { id: 'test-1', testFile: 'a.spec.ts', testName: 'Test A', projectId: 'proj-1' },
      ]);

      const run = {
        id: 'run-1',
        status: AutomationRunStatus.QUEUED,
        errorMessage: null as string | null,
        completedAt: null as Date | null,
      };
      mockRunRepo.create.mockReturnValue(run);
      mockRunRepo.save.mockResolvedValue(run);
      mockRunSpawner.spawn.mockRejectedValue(new Error('No such image: veriflow-runner:latest'));

      const result = await service.triggerRun('proj-1', { baseUrl: 'http://localhost' });

      expect(result.runIds).toEqual(['run-1']);
      expect(run.status).toBe(AutomationRunStatus.ERROR);
      expect(run.errorMessage).toContain('No such image');
      expect(mockRunRepo.save).toHaveBeenCalledTimes(2); // once QUEUED, once ERROR
    });

    it('should throw BadRequestException if no repo config', async () => {
      mockConfigRepo.findOne.mockResolvedValue(null);
      await expect(
        service.triggerRun('proj-1', { baseUrl: 'http://localhost' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if no tests found', async () => {
      mockConfigRepo.findOne.mockResolvedValue({
        repoUrl: 'https://github.com/org/repo',
        branch: 'main',
        testDirectory: 'tests',
        authToken: null,
        playwrightConfig: null,
      });
      mockTestRepo.find.mockResolvedValue([]);

      await expect(
        service.triggerRun('proj-1', { baseUrl: 'http://localhost' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reportRun', () => {
    it('should create a new run from CI/CD report', async () => {
      mockTestRepo.findOne.mockResolvedValue({
        id: 'test-1',
        projectId: 'proj-1',
      });
      mockRunRepo.findOne.mockResolvedValue(null);
      const run = { id: 'run-new' };
      mockRunRepo.create.mockReturnValue(run);
      mockRunRepo.save.mockResolvedValue(run);

      const result = await service.reportRun('proj-1', {
        testId: 'test-1',
        status: AutomationRunStatus.PASS,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 1200,
      });

      expect(result).toEqual(run);
      expect(mockRunRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ triggeredBy: AutomationTrigger.CI_CD }),
      );
    });

    it('should update existing run when externalRunId matches', async () => {
      mockTestRepo.findOne.mockResolvedValue({
        id: 'test-1',
        projectId: 'proj-1',
      });
      const existingRun = {
        id: 'run-1',
        status: AutomationRunStatus.RUNNING,
        duration: null,
        completedAt: null,
        errorMessage: null,
        logs: null,
      };
      mockRunRepo.findOne.mockResolvedValue(existingRun);
      mockRunRepo.save.mockResolvedValue({
        ...existingRun,
        status: AutomationRunStatus.PASS,
      });

      await service.reportRun('proj-1', {
        testId: 'test-1',
        status: AutomationRunStatus.PASS,
        startedAt: new Date().toISOString(),
        externalRunId: 'ci-run-123',
        duration: 800,
      });

      expect(existingRun.status).toBe(AutomationRunStatus.PASS);
      expect(existingRun.duration).toBe(800);
    });

    it('should throw NotFoundException if test not found', async () => {
      mockTestRepo.findOne.mockResolvedValue(null);
      await expect(
        service.reportRun('proj-1', {
          testId: 'missing',
          status: AutomationRunStatus.PASS,
          startedAt: new Date().toISOString(),
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRun', () => {
    it('should return a run with test relation', async () => {
      const run = { id: 'run-1', status: AutomationRunStatus.PASS };
      mockRunRepo.findOne.mockResolvedValue(run);
      const result = await service.getRun('run-1');
      expect(result).toEqual(run);
    });

    it('should throw NotFoundException if run not found', async () => {
      mockRunRepo.findOne.mockResolvedValue(null);
      await expect(service.getRun('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getRunStatus', () => {
    it('should return status object', async () => {
      mockRunRepo.findOne.mockResolvedValue({
        id: 'run-1',
        status: AutomationRunStatus.RUNNING,
      });
      const result = await service.getRunStatus('run-1');
      expect(result).toEqual({ status: AutomationRunStatus.RUNNING });
    });

    it('should throw NotFoundException if run not found', async () => {
      mockRunRepo.findOne.mockResolvedValue(null);
      await expect(service.getRunStatus('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateRunStatus', () => {
    it('should update run status fields', async () => {
      const run = {
        id: 'run-1',
        status: AutomationRunStatus.RUNNING,
        duration: null,
        completedAt: null,
        errorMessage: null,
        logs: null,
      };
      mockRunRepo.findOne.mockResolvedValue(run);
      mockRunRepo.save.mockResolvedValue({
        ...run,
        status: AutomationRunStatus.PASS,
      });

      await service.updateRunStatus('run-1', {
        status: AutomationRunStatus.PASS,
        duration: 1500,
        completedAt: new Date().toISOString(),
      });

      expect(run.status).toBe(AutomationRunStatus.PASS);
      expect(run.duration).toBe(1500);
    });

    it('should throw NotFoundException if run not found', async () => {
      mockRunRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateRunStatus('missing', {
          status: AutomationRunStatus.PASS,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRepoConfig', () => {
    it('should return config with masked auth token', async () => {
      mockConfigRepo.findOne.mockResolvedValue({
        id: 'cfg-1',
        projectId: 'proj-1',
        repoUrl: 'https://github.com/org/repo',
        authToken: 'encrypted-token',
      });

      const result = await service.getRepoConfig('proj-1');
      expect(result.authToken).toBe('***');
    });

    it('should return null authToken when none set', async () => {
      mockConfigRepo.findOne.mockResolvedValue({
        id: 'cfg-1',
        projectId: 'proj-1',
        repoUrl: 'https://github.com/org/repo',
        authToken: null,
      });

      const result = await service.getRepoConfig('proj-1');
      expect(result.authToken).toBeNull();
    });

    it('should throw NotFoundException if config not found', async () => {
      mockConfigRepo.findOne.mockResolvedValue(null);
      await expect(service.getRepoConfig('proj-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('upsertRepoConfig', () => {
    it('should create new config and encrypt authToken', async () => {
      const encKey = generateKey();
      mockConfigService.get.mockReturnValue(encKey);
      mockConfigRepo.findOne.mockResolvedValue(null);

      const cfg = {
        projectId: 'proj-1',
        repoUrl: 'https://github.com/org/repo',
        branch: 'main',
        testDirectory: 'tests',
        playwrightConfig: null,
        authToken: 'some-encrypted-value',
      };
      mockConfigRepo.create.mockReturnValue(cfg);
      mockConfigRepo.save.mockResolvedValue(cfg);

      const result = await service.upsertRepoConfig('proj-1', {
        repoUrl: 'https://github.com/org/repo',
        authToken: 'ghp_mytoken',
      });

      expect(result.authToken).toBe('***');
      expect(mockConfigRepo.save).toHaveBeenCalled();
    });

    it('should update existing config', async () => {
      const encKey = generateKey();
      mockConfigService.get.mockReturnValue(encKey);

      const existing = {
        projectId: 'proj-1',
        repoUrl: 'https://old.url',
        branch: 'main',
        testDirectory: 'tests',
        playwrightConfig: null,
        authToken: null,
      };
      mockConfigRepo.findOne.mockResolvedValue(existing);
      mockConfigRepo.save.mockResolvedValue(existing);

      await service.upsertRepoConfig('proj-1', {
        repoUrl: 'https://new.url',
      });

      expect(existing.repoUrl).toBe('https://new.url');
    });
  });
});

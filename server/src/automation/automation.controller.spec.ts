import { Test, TestingModule } from '@nestjs/testing';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { WorkerAuthGuard } from './guards/worker-auth.guard';
import { AutomationRunStatus } from '../common/types/enums';

describe('AutomationController', () => {
  let controller: AutomationController;

  const mockService = {
    registrySync: jest.fn(),
    listTests: jest.fn(),
    getTest: jest.fn(),
    deleteTest: jest.fn(),
    linkTests: jest.fn(),
    unlinkTest: jest.fn(),
    getAutomationSummary: jest.fn(),
    triggerRun: jest.fn(),
    reportRun: jest.fn(),
    listRuns: jest.fn(),
    getRun: jest.fn(),
    getRunStatus: jest.fn(),
    updateRunStatus: jest.fn(),
    getRepoConfig: jest.fn(),
    upsertRepoConfig: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AutomationController],
      providers: [{ provide: AutomationService, useValue: mockService }],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(WorkerAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AutomationController>(AutomationController);
    jest.clearAllMocks();
  });

  describe('registrySync', () => {
    it('should call service.registrySync and return counts', async () => {
      mockService.registrySync.mockResolvedValue({
        created: 2,
        updated: 1,
        deleted: 0,
      });

      const result = await controller.registrySync('proj-1', {
        tests: [
          { externalId: 'e1', testFile: 'f.spec.ts', testName: 'Test 1' },
          { externalId: 'e2', testFile: 'g.spec.ts', testName: 'Test 2' },
        ],
      });

      expect(mockService.registrySync).toHaveBeenCalledWith(
        'proj-1',
        expect.any(Object),
      );
      expect(result).toEqual({ created: 2, updated: 1, deleted: 0 });
    });
  });

  describe('listTests', () => {
    it('should call service.listTests with projectId and query', async () => {
      const mockResult = {
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };
      mockService.listTests.mockResolvedValue(mockResult);

      const result = await controller.listTests('proj-1', {});

      expect(mockService.listTests).toHaveBeenCalledWith('proj-1', {});
      expect(result).toEqual(mockResult);
    });
  });

  describe('getTest', () => {
    it('should call service.getTest and return test detail', async () => {
      const detail = {
        test: { id: 'test-1' },
        linkedStories: [],
        recentRuns: [],
      };
      mockService.getTest.mockResolvedValue(detail);

      const result = await controller.getTest('test-1');

      expect(mockService.getTest).toHaveBeenCalledWith('test-1');
      expect(result).toEqual(detail);
    });
  });

  describe('deleteTest', () => {
    it('should call service.deleteTest', async () => {
      mockService.deleteTest.mockResolvedValue(undefined);

      await controller.deleteTest('test-1');

      expect(mockService.deleteTest).toHaveBeenCalledWith('test-1');
    });
  });

  describe('linkTests', () => {
    it('should call service.linkTests and return links', async () => {
      const links = [{ id: 'link-1' }];
      mockService.linkTests.mockResolvedValue(links);

      const result = await controller.linkTests('story-1', {
        testIds: ['test-1'],
      });

      expect(mockService.linkTests).toHaveBeenCalledWith('story-1', {
        testIds: ['test-1'],
      });
      expect(result).toEqual(links);
    });
  });

  describe('unlinkTest', () => {
    it('should call service.unlinkTest', async () => {
      mockService.unlinkTest.mockResolvedValue(undefined);

      await controller.unlinkTest('story-1', 'test-1');

      expect(mockService.unlinkTest).toHaveBeenCalledWith('story-1', 'test-1');
    });
  });

  describe('getAutomationSummary', () => {
    it('should call service.getAutomationSummary', async () => {
      const summary = {
        tests: [],
        latestManualStatus: null,
        hasConflict: false,
      };
      mockService.getAutomationSummary.mockResolvedValue(summary);

      const result = await controller.getAutomationSummary('story-1');

      expect(mockService.getAutomationSummary).toHaveBeenCalledWith('story-1');
      expect(result).toEqual(summary);
    });
  });

  describe('triggerRun', () => {
    it('should call service.triggerRun and return runIds', async () => {
      mockService.triggerRun.mockResolvedValue({ runIds: ['run-1', 'run-2'] });

      const result = await controller.triggerRun('proj-1', {
        baseUrl: 'http://localhost:3000',
      });

      expect(mockService.triggerRun).toHaveBeenCalledWith(
        'proj-1',
        expect.any(Object),
      );
      expect(result).toEqual({ runIds: ['run-1', 'run-2'] });
    });
  });

  describe('reportRun', () => {
    it('should call service.reportRun', async () => {
      const run = { id: 'run-1', status: AutomationRunStatus.PASS };
      mockService.reportRun.mockResolvedValue(run);

      const result = await controller.reportRun('proj-1', {
        testId: 'test-1',
        status: AutomationRunStatus.PASS,
        startedAt: new Date().toISOString(),
      });

      expect(mockService.reportRun).toHaveBeenCalledWith(
        'proj-1',
        expect.any(Object),
      );
      expect(result).toEqual(run);
    });
  });

  describe('listRuns', () => {
    it('should call service.listRuns', async () => {
      const mockResult = {
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };
      mockService.listRuns.mockResolvedValue(mockResult);

      const result = await controller.listRuns('proj-1', {});

      expect(mockService.listRuns).toHaveBeenCalledWith('proj-1', {});
      expect(result).toEqual(mockResult);
    });
  });

  describe('getRun', () => {
    it('should call service.getRun', async () => {
      const run = { id: 'run-1', status: AutomationRunStatus.PASS };
      mockService.getRun.mockResolvedValue(run);

      const result = await controller.getRun('run-1');

      expect(mockService.getRun).toHaveBeenCalledWith('run-1');
      expect(result).toEqual(run);
    });
  });

  describe('getRunStatus', () => {
    it('should call service.getRunStatus', async () => {
      mockService.getRunStatus.mockResolvedValue({
        status: AutomationRunStatus.RUNNING,
      });

      const result = await controller.getRunStatus('run-1');

      expect(mockService.getRunStatus).toHaveBeenCalledWith('run-1');
      expect(result).toEqual({ status: AutomationRunStatus.RUNNING });
    });
  });

  describe('updateRunStatus', () => {
    it('should call service.updateRunStatus via worker auth', async () => {
      const run = { id: 'run-1', status: AutomationRunStatus.PASS };
      mockService.updateRunStatus.mockResolvedValue(run);

      const result = await controller.updateRunStatus('run-1', {
        status: AutomationRunStatus.PASS,
        duration: 1000,
      });

      expect(mockService.updateRunStatus).toHaveBeenCalledWith(
        'run-1',
        expect.any(Object),
      );
      expect(result).toEqual(run);
    });
  });

  describe('getRepoConfig', () => {
    it('should call service.getRepoConfig', async () => {
      const cfg = {
        id: 'cfg-1',
        projectId: 'proj-1',
        repoUrl: 'https://github.com/o/r',
      };
      mockService.getRepoConfig.mockResolvedValue(cfg);

      const result = await controller.getRepoConfig('proj-1');

      expect(mockService.getRepoConfig).toHaveBeenCalledWith('proj-1');
      expect(result).toEqual(cfg);
    });
  });

  describe('upsertRepoConfig', () => {
    it('should call service.upsertRepoConfig', async () => {
      const cfg = {
        id: 'cfg-1',
        projectId: 'proj-1',
        repoUrl: 'https://github.com/o/r',
        authToken: '***',
      };
      mockService.upsertRepoConfig.mockResolvedValue(cfg);

      const result = await controller.upsertRepoConfig('proj-1', {
        repoUrl: 'https://github.com/o/r',
      });

      expect(mockService.upsertRepoConfig).toHaveBeenCalledWith(
        'proj-1',
        expect.any(Object),
      );
      expect(result).toEqual(cfg);
    });
  });
});

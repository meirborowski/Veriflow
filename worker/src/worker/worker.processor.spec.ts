import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';

// Must mock both before any imports that transitively load them
jest.mock('child_process', () => ({ spawn: jest.fn() }));
jest.mock('simple-git', () => ({ __esModule: true, default: jest.fn() }));

import { WorkerProcessor, RunTestJobData } from './worker.processor';
import { GitService } from './git.service';
import { RunnerService } from './runner.service';
import { ReporterService } from './reporter.service';
import { spawn } from 'child_process';
import { Job } from 'bull';

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

type FakeChild = EventEmitter & { kill?: jest.Mock };

function makeInstallProcess(exitCode = 0): FakeChild {
  const child = new EventEmitter();
  setTimeout(() => child.emit('close', exitCode), 5);
  return child;
}

function makeJob(data: RunTestJobData): Job<RunTestJobData> {
  return { data } as Job<RunTestJobData>;
}

describe('WorkerProcessor', () => {
  let processor: WorkerProcessor;

  const mockGit = { prepare: jest.fn() };
  const mockRunner = { run: jest.fn() };
  const mockReporter = {
    updateStatus: jest.fn(),
    reportResult: jest.fn(),
  };
  const mockConfig = {
    get: jest.fn((key: string, def?: unknown) => {
      if (key === 'MAX_RUN_DURATION_MS') return 600_000;
      return def;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerProcessor,
        { provide: GitService, useValue: mockGit },
        { provide: RunnerService, useValue: mockRunner },
        { provide: ReporterService, useValue: mockReporter },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    processor = module.get<WorkerProcessor>(WorkerProcessor);
    jest.clearAllMocks();
  });

  const baseJobData: RunTestJobData = {
    runId: 'run-1',
    repoUrl: 'https://github.com/org/repo',
    branch: 'main',
    testDirectory: 'tests',
    testFile: 'login.spec.ts',
    testName: 'Login works',
    baseUrl: 'http://localhost:3000',
  };

  describe('happy path — PASS', () => {
    it('should progress through CLONING → INSTALLING → RUNNING → PASS', async () => {
      mockGit.prepare.mockResolvedValue('/tmp/repo');
      mockSpawn
        .mockReturnValueOnce(makeInstallProcess(0) as unknown as ReturnType<typeof spawn>)
        .mockReturnValueOnce(makeInstallProcess(0) as unknown as ReturnType<typeof spawn>);
      mockRunner.run.mockResolvedValue({ outcome: 'pass', duration: 1234, logs: 'ok' });
      mockReporter.updateStatus.mockResolvedValue(undefined);
      mockReporter.reportResult.mockResolvedValue(undefined);

      await processor.handleRunTest(makeJob(baseJobData));

      expect(mockReporter.updateStatus).toHaveBeenCalledWith('run-1', 'CLONING');
      expect(mockReporter.updateStatus).toHaveBeenCalledWith('run-1', 'INSTALLING');
      expect(mockReporter.updateStatus).toHaveBeenCalledWith('run-1', 'RUNNING');
      expect(mockReporter.reportResult).toHaveBeenCalledWith(
        'run-1',
        expect.objectContaining({ status: 'PASS', duration: 1234 }),
      );
    });
  });

  describe('happy path — FAIL', () => {
    it('should report FAIL when runner returns fail', async () => {
      mockGit.prepare.mockResolvedValue('/tmp/repo');
      mockSpawn
        .mockReturnValueOnce(makeInstallProcess(0) as unknown as ReturnType<typeof spawn>)
        .mockReturnValueOnce(makeInstallProcess(0) as unknown as ReturnType<typeof spawn>);
      mockRunner.run.mockResolvedValue({ outcome: 'fail', duration: 500, logs: 'assertion error' });
      mockReporter.updateStatus.mockResolvedValue(undefined);
      mockReporter.reportResult.mockResolvedValue(undefined);

      await processor.handleRunTest(makeJob(baseJobData));

      expect(mockReporter.reportResult).toHaveBeenCalledWith(
        'run-1',
        expect.objectContaining({ status: 'FAIL' }),
      );
    });
  });

  describe('timeout', () => {
    it('should report TIMEOUT when runner returns timeout error message', async () => {
      mockGit.prepare.mockResolvedValue('/tmp/repo');
      mockSpawn
        .mockReturnValueOnce(makeInstallProcess(0) as unknown as ReturnType<typeof spawn>)
        .mockReturnValueOnce(makeInstallProcess(0) as unknown as ReturnType<typeof spawn>);
      mockRunner.run.mockResolvedValue({
        outcome: 'error',
        duration: 600_000,
        logs: '',
        errorMessage: 'Test run timed out',
      });
      mockReporter.updateStatus.mockResolvedValue(undefined);
      mockReporter.reportResult.mockResolvedValue(undefined);

      await processor.handleRunTest(makeJob(baseJobData));

      expect(mockReporter.reportResult).toHaveBeenCalledWith(
        'run-1',
        expect.objectContaining({ status: 'TIMEOUT', errorMessage: 'Test run timed out' }),
      );
    });
  });

  describe('error paths', () => {
    it('should report ERROR when git clone fails', async () => {
      mockGit.prepare.mockRejectedValue(new Error('Auth failure'));
      mockReporter.updateStatus.mockResolvedValue(undefined);
      mockReporter.reportResult.mockResolvedValue(undefined);

      await processor.handleRunTest(makeJob(baseJobData));

      expect(mockReporter.reportResult).toHaveBeenCalledWith(
        'run-1',
        expect.objectContaining({ status: 'ERROR', errorMessage: 'Auth failure' }),
      );
    });

    it('should report ERROR when npm ci fails', async () => {
      mockGit.prepare.mockResolvedValue('/tmp/repo');
      mockSpawn.mockReturnValue(makeInstallProcess(1) as unknown as ReturnType<typeof spawn>);
      mockReporter.updateStatus.mockResolvedValue(undefined);
      mockReporter.reportResult.mockResolvedValue(undefined);

      await processor.handleRunTest(makeJob(baseJobData));

      expect(mockReporter.reportResult).toHaveBeenCalledWith(
        'run-1',
        expect.objectContaining({ status: 'ERROR' }),
      );
    });

    it('should report ERROR when runner throws', async () => {
      mockGit.prepare.mockResolvedValue('/tmp/repo');
      mockSpawn
        .mockReturnValueOnce(makeInstallProcess(0) as unknown as ReturnType<typeof spawn>)
        .mockReturnValueOnce(makeInstallProcess(0) as unknown as ReturnType<typeof spawn>);
      mockRunner.run.mockRejectedValue(new Error('Playwright not found'));
      mockReporter.updateStatus.mockResolvedValue(undefined);
      mockReporter.reportResult.mockResolvedValue(undefined);

      await processor.handleRunTest(makeJob(baseJobData));

      expect(mockReporter.reportResult).toHaveBeenCalledWith(
        'run-1',
        expect.objectContaining({ status: 'ERROR', errorMessage: 'Playwright not found' }),
      );
    });

    it('should report ERROR when runner returns generic error outcome', async () => {
      mockGit.prepare.mockResolvedValue('/tmp/repo');
      mockSpawn
        .mockReturnValueOnce(makeInstallProcess(0) as unknown as ReturnType<typeof spawn>)
        .mockReturnValueOnce(makeInstallProcess(0) as unknown as ReturnType<typeof spawn>);
      mockRunner.run.mockResolvedValue({
        outcome: 'error',
        duration: 100,
        logs: '',
        errorMessage: 'JSON parse failure',
      });
      mockReporter.updateStatus.mockResolvedValue(undefined);
      mockReporter.reportResult.mockResolvedValue(undefined);

      await processor.handleRunTest(makeJob(baseJobData));

      expect(mockReporter.reportResult).toHaveBeenCalledWith(
        'run-1',
        expect.objectContaining({ status: 'ERROR' }),
      );
    });
  });

  describe('testDirectory path traversal guard', () => {
    it('should report ERROR when testDirectory escapes the repo', async () => {
      mockGit.prepare.mockResolvedValue('/tmp/repo');
      mockReporter.updateStatus.mockResolvedValue(undefined);
      mockReporter.reportResult.mockResolvedValue(undefined);

      await processor.handleRunTest(makeJob({ ...baseJobData, testDirectory: '../../etc' }));

      expect(mockReporter.reportResult).toHaveBeenCalledWith(
        'run-1',
        expect.objectContaining({
          status: 'ERROR',
          errorMessage: 'Invalid testDirectory: must be within the cloned repository',
        }),
      );
    });
  });

  describe('auth token', () => {
    it('should pass auth token to git.prepare', async () => {
      mockGit.prepare.mockResolvedValue('/tmp/repo');
      mockSpawn
        .mockReturnValueOnce(makeInstallProcess(0) as unknown as ReturnType<typeof spawn>)
        .mockReturnValueOnce(makeInstallProcess(0) as unknown as ReturnType<typeof spawn>);
      mockRunner.run.mockResolvedValue({ outcome: 'pass', duration: 100, logs: '' });
      mockReporter.updateStatus.mockResolvedValue(undefined);
      mockReporter.reportResult.mockResolvedValue(undefined);

      await processor.handleRunTest(makeJob({ ...baseJobData, authToken: 'secret-token' }));

      expect(mockGit.prepare).toHaveBeenCalledWith(
        baseJobData.repoUrl,
        baseJobData.branch,
        'secret-token',
      );
    });
  });
});

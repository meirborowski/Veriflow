import * as path from 'path';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import { GitService } from './git.service';
import { RunnerService } from './runner.service';
import { ReporterService } from './reporter.service';

export interface RunTestJobData {
  runId: string;
  repoUrl: string;
  branch: string;
  testDirectory: string;
  testFile: string;
  testName: string;
  baseUrl: string;
  playwrightConfig?: string;
  authToken?: string;
}

const STATUS = {
  CLONING: 'CLONING',
  INSTALLING: 'INSTALLING',
  RUNNING: 'RUNNING',
  PASS: 'PASS',
  FAIL: 'FAIL',
  ERROR: 'ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;

@Processor('automation')
export class WorkerProcessor {
  private readonly logger = new Logger(WorkerProcessor.name);
  private readonly maxRunDurationMs: number;

  constructor(
    private readonly git: GitService,
    private readonly runner: RunnerService,
    private readonly reporter: ReporterService,
    private readonly config: ConfigService,
  ) {
    this.maxRunDurationMs = config.get<number>('MAX_RUN_DURATION_MS', 600_000);
  }

  @Process('run-test')
  async handleRunTest(job: Job<RunTestJobData>): Promise<void> {
    const { runId, repoUrl, branch, testDirectory, testFile, testName, baseUrl, playwrightConfig, authToken } =
      job.data;

    this.logger.log(`Processing run ${runId}: ${testFile} — ${testName}`);

    try {
      // 1. Clone / pull
      await this.reporter.updateStatus(runId, STATUS.CLONING);
      const repoDir = await this.git.prepare(repoUrl, branch, authToken);
      const resolvedRepoDir = path.resolve(repoDir);
      const workDir = testDirectory ? path.resolve(resolvedRepoDir, testDirectory) : resolvedRepoDir;
      if (workDir !== resolvedRepoDir && !workDir.startsWith(resolvedRepoDir + path.sep)) {
        throw new Error('Invalid testDirectory: must be within the cloned repository');
      }

      // 2. npm ci
      await this.reporter.updateStatus(runId, STATUS.INSTALLING);
      await this.install(workDir);

      // 3. Run Playwright
      await this.reporter.updateStatus(runId, STATUS.RUNNING);
      const result = await this.runner.run(
        workDir,
        testFile,
        testName,
        baseUrl,
        playwrightConfig,
        this.maxRunDurationMs,
      );

      // 4. Report final result
      const completedAt = new Date().toISOString();
      if (result.outcome === 'error' && result.errorMessage === 'Test run timed out') {
        await this.reporter.reportResult(runId, {
          status: STATUS.TIMEOUT,
          duration: result.duration,
          completedAt,
          logs: result.logs,
          errorMessage: result.errorMessage,
        });
      } else {
        await this.reporter.reportResult(runId, {
          status: result.outcome === 'pass' ? STATUS.PASS : result.outcome === 'fail' ? STATUS.FAIL : STATUS.ERROR,
          duration: result.duration,
          completedAt,
          logs: result.logs,
          errorMessage: result.errorMessage,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Run ${runId} failed with uncaught error: ${message}`);
      await this.reporter.reportResult(runId, {
        status: STATUS.ERROR,
        completedAt: new Date().toISOString(),
        errorMessage: message,
      });
    }
  }

  private install(workDir: string): Promise<void> {
    return this.spawn('npm', ['ci'], workDir)
      .then(() => this.spawn('npx', ['playwright', 'install', 'chromium', '--with-deps'], workDir));
  }

  private spawn(cmd: string, args: string[], cwd: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process') as typeof import('child_process');
      const child = spawn(cmd, args, { cwd, stdio: 'inherit' });
      child.on('close', (code: number | null) => {
        if (code === 0) resolve();
        else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code ?? 'null'}`));
      });
      child.on('error', reject);
    });
  }
}

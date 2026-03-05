import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';

export type RunOutcome = 'pass' | 'fail' | 'error';

export interface RunResult {
  outcome: RunOutcome;
  duration: number;
  logs: string;
  errorMessage?: string;
}

interface PlaywrightJsonResult {
  suites?: PlaywrightSuite[];
}

interface PlaywrightSuite {
  specs?: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

interface PlaywrightSpec {
  tests?: PlaywrightTest[];
}

interface PlaywrightTest {
  results?: { status: string }[];
}

@Injectable()
export class RunnerService {
  private readonly logger = new Logger(RunnerService.name);

  /**
   * Executes a single Playwright test by file + name using the JSON reporter.
   * Returns outcome (pass/fail/error), duration, raw logs, and optional error message.
   */
  async run(
    repoDir: string,
    testFile: string,
    testName: string,
    baseUrl: string,
    playwrightConfig?: string,
    timeoutMs?: number,
  ): Promise<RunResult> {
    const startedAt = Date.now();
    const args = ['playwright', 'test', testFile, '--grep', testName, '--reporter=json'];
    if (playwrightConfig) {
      args.push('--config', playwrightConfig);
    }

    const env = { ...process.env, BASE_URL: baseUrl, PLAYWRIGHT_JSON_OUTPUT_NAME: '' };

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const child = spawn('npx', args, { cwd: repoDir, env });

      child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
      child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

      child.on('error', (err) => {
        if (timer) clearTimeout(timer);
        reject(err);
      });

      let timer: ReturnType<typeof setTimeout> | undefined;
      if (timeoutMs) {
        timer = setTimeout(() => {
          timedOut = true;
          child.kill('SIGTERM');
        }, timeoutMs);
      }

      child.on('close', (code: number | null) => {
        if (timer) clearTimeout(timer);
        const duration = Date.now() - startedAt;
        const logs = [stdout, stderr].filter(Boolean).join('\n');

        if (timedOut) {
          resolve({ outcome: 'error', duration, logs, errorMessage: 'Test run timed out' });
          return;
        }

        try {
          const parsed = this.parseJson(stdout);
          const outcome = this.determineOutcome(parsed);
          resolve({ outcome, duration, logs });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`Failed to parse Playwright JSON output (exit code ${code ?? 'null'}): ${message}`);
          resolve({
            outcome: 'error',
            duration,
            logs,
            errorMessage: `Playwright exited with code ${code ?? 'null'} and produced no parseable JSON. Check logs for details.`,
          });
        }
      });
    });
  }

  private parseJson(stdout: string): PlaywrightJsonResult {
    // Playwright JSON reporter may mix non-JSON lines before the JSON blob
    const jsonStart = stdout.indexOf('{');
    if (jsonStart === -1) throw new Error('No JSON object found in output');
    return JSON.parse(stdout.slice(jsonStart)) as PlaywrightJsonResult;
  }

  private determineOutcome(result: PlaywrightJsonResult): RunOutcome {
    const statuses = this.collectStatuses(result.suites ?? []);
    if (statuses.length === 0) return 'error';
    if (statuses.some((s) => s === 'failed')) return 'fail';
    if (statuses.every((s) => s === 'passed')) return 'pass';
    return 'fail';
  }

  private collectStatuses(suites: PlaywrightSuite[]): string[] {
    const statuses: string[] = [];
    for (const suite of suites) {
      for (const spec of suite.specs ?? []) {
        for (const test of spec.tests ?? []) {
          for (const result of test.results ?? []) {
            statuses.push(result.status);
          }
        }
      }
      statuses.push(...this.collectStatuses(suite.suites ?? []));
    }
    return statuses;
  }
}

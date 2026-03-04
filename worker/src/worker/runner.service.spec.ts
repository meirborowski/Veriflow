import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter } from 'events';
import { RunnerService } from './runner.service';

jest.mock('child_process', () => ({ spawn: jest.fn() }));

import { spawn } from 'child_process';
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

type FakeChild = EventEmitter & { stdout: EventEmitter; stderr: EventEmitter; kill: jest.Mock };

function makeChildProcess(stdout: string, stderr = ''): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = jest.fn(() => {
    setTimeout(() => child.emit('close', null), 10);
  });
  setTimeout(() => {
    child.stdout.emit('data', Buffer.from(stdout));
    if (stderr) child.stderr.emit('data', Buffer.from(stderr));
    child.emit('close', 0);
  }, 10);
  return child;
}

const passingJson = JSON.stringify({
  suites: [{ specs: [{ tests: [{ results: [{ status: 'passed' }] }] }] }],
});

const failingJson = JSON.stringify({
  suites: [{ specs: [{ tests: [{ results: [{ status: 'failed' }] }] }] }],
});

describe('RunnerService', () => {
  let service: RunnerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RunnerService],
    }).compile();

    service = module.get<RunnerService>(RunnerService);
    jest.clearAllMocks();
  });

  it('should return pass when all results are passed', async () => {
    mockSpawn.mockReturnValue(makeChildProcess(passingJson) as unknown as ReturnType<typeof spawn>);

    const result = await service.run('/repo', 'test.spec.ts', 'My Test', 'http://localhost');

    expect(result.outcome).toBe('pass');
    expect(result.duration).toBeGreaterThan(0);
  });

  it('should return fail when any result is failed', async () => {
    mockSpawn.mockReturnValue(makeChildProcess(failingJson) as unknown as ReturnType<typeof spawn>);

    const result = await service.run('/repo', 'test.spec.ts', 'My Test', 'http://localhost');

    expect(result.outcome).toBe('fail');
  });

  it('should return error when JSON cannot be parsed', async () => {
    mockSpawn.mockReturnValue(makeChildProcess('not json output') as unknown as ReturnType<typeof spawn>);

    const result = await service.run('/repo', 'test.spec.ts', 'My Test', 'http://localhost');

    expect(result.outcome).toBe('error');
    expect(result.errorMessage).toContain('JSON parse failure');
  });

  it('should return error with timeout message when killed', async () => {
    // Create a child that only closes after being killed (via the kill mock)
    const child = new EventEmitter() as FakeChild;
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = jest.fn(() => setTimeout(() => child.emit('close', null), 5));
    mockSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

    const result = await service.run(
      '/repo',
      'test.spec.ts',
      'My Test',
      'http://localhost',
      undefined,
      1, // 1ms timeout
    );

    expect(result.outcome).toBe('error');
    expect(result.errorMessage).toBe('Test run timed out');
  });

  it('should pass playwrightConfig flag when provided', async () => {
    mockSpawn.mockReturnValue(makeChildProcess(passingJson) as unknown as ReturnType<typeof spawn>);

    await service.run('/repo', 'test.spec.ts', 'My Test', 'http://localhost', 'pw.config.ts');

    expect(mockSpawn).toHaveBeenCalledWith(
      'npx',
      expect.arrayContaining(['--config', 'pw.config.ts']),
      expect.any(Object),
    );
  });

  it('should return error when suites array is empty', async () => {
    mockSpawn.mockReturnValue(
      makeChildProcess(JSON.stringify({ suites: [] })) as unknown as ReturnType<typeof spawn>,
    );

    const result = await service.run('/repo', 'test.spec.ts', 'My Test', 'http://localhost');

    expect(result.outcome).toBe('error');
  });

  it('should handle nested suites', async () => {
    const nested = JSON.stringify({
      suites: [
        {
          suites: [{ specs: [{ tests: [{ results: [{ status: 'passed' }] }] }] }],
        },
      ],
    });
    mockSpawn.mockReturnValue(makeChildProcess(nested) as unknown as ReturnType<typeof spawn>);

    const result = await service.run('/repo', 'test.spec.ts', 'My Test', 'http://localhost');

    expect(result.outcome).toBe('pass');
  });
});

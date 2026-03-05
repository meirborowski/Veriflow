import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DockerRunSpawnerService } from './docker-run-spawner.service';
import type { RunSpawnConfig } from '../run-spawner.service';

const mockStart = jest.fn();
const mockCreateContainer = jest.fn();

jest.mock('dockerode', () => {
  return jest.fn().mockImplementation(() => ({
    createContainer: mockCreateContainer,
  }));
});

const baseConfig: RunSpawnConfig = {
  runId: 'run-1',
  repoUrl: 'https://github.com/org/repo',
  branch: 'main',
  testDirectory: 'tests',
  testFile: 'auth.spec.ts',
  testName: 'should login',
  baseUrl: 'http://localhost:3000',
};

describe('DockerRunSpawnerService', () => {
  let service: DockerRunSpawnerService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Re-set defaults after clearAllMocks resets implementations
    mockStart.mockResolvedValue(undefined);
    mockCreateContainer.mockResolvedValue({ start: mockStart });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DockerRunSpawnerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def?: unknown) => {
              const map: Record<string, unknown> = {
                DOCKER_SOCKET: '/var/run/docker.sock',
                RUNNER_IMAGE: 'veriflow-runner:latest',
                DOCKER_NETWORK: 'veriflow',
                VERIFLOW_API_URL: 'http://server:3001/api/v1',
                WORKER_API_KEY: 'test-key',
              };
              return map[key] ?? def;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(DockerRunSpawnerService);
  });

  it('creates and starts a container with required env vars', async () => {
    await service.spawn(baseConfig);

    expect(mockCreateContainer).toHaveBeenCalledTimes(1);
    const callArg = mockCreateContainer.mock.calls[0][0] as {
      Image: string;
      Env: string[];
      HostConfig: { AutoRemove: boolean; NetworkMode: string };
    };
    expect(callArg.Image).toBe('veriflow-runner:latest');
    expect(callArg.HostConfig.AutoRemove).toBe(true);
    expect(callArg.HostConfig.NetworkMode).toBe('veriflow');

    const env: string[] = callArg.Env;
    expect(env).toContain('VERIFLOW_RUN_ID=run-1');
    expect(env).toContain('VERIFLOW_REPO_URL=https://github.com/org/repo');
    expect(env).toContain('VERIFLOW_BRANCH=main');
    expect(env).toContain('VERIFLOW_TEST_DIRECTORY=tests');
    expect(env).toContain('VERIFLOW_TEST_FILE=auth.spec.ts');
    expect(env).toContain('VERIFLOW_TEST_NAME=should login');
    expect(env).toContain('VERIFLOW_API_URL=http://server:3001/api/v1');
    expect(env).toContain('WORKER_API_KEY=test-key');

    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('includes optional env vars when provided', async () => {
    await service.spawn({ ...baseConfig, playwrightConfig: 'playwright.config.ts', authToken: 'gh-token' });

    const callArg = mockCreateContainer.mock.calls[0][0] as { Env: string[] };
    expect(callArg.Env).toContain('VERIFLOW_PLAYWRIGHT_CONFIG=playwright.config.ts');
    expect(callArg.Env).toContain('VERIFLOW_AUTH_TOKEN=gh-token');
  });

  it('omits optional env vars when not provided', async () => {
    await service.spawn(baseConfig);

    const callArg = mockCreateContainer.mock.calls[0][0] as { Env: string[] };
    const keys = callArg.Env.map((e) => e.split('=')[0]);
    expect(keys).not.toContain('VERIFLOW_PLAYWRIGHT_CONFIG');
    expect(keys).not.toContain('VERIFLOW_AUTH_TOKEN');
  });

  it('throws when Docker createContainer fails', async () => {
    mockCreateContainer.mockRejectedValueOnce(new Error('Docker socket unavailable'));
    await expect(service.spawn(baseConfig)).rejects.toThrow('Docker socket unavailable');
  });

  it('throws when container.start() fails', async () => {
    mockStart.mockRejectedValueOnce(new Error('container OOM'));
    await expect(service.spawn(baseConfig)).rejects.toThrow('container OOM');
  });
});

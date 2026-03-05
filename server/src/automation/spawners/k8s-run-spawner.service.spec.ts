import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { K8sRunSpawnerService } from './k8s-run-spawner.service';
import type { RunSpawnConfig } from '../run-spawner.service';

const mockCreateNamespacedJob = jest.fn();
const mockMakeApiClient = jest.fn();
const mockLoadFromCluster = jest.fn();
const mockLoadFromDefault = jest.fn();

jest.mock('@kubernetes/client-node', () => ({
  KubeConfig: jest.fn().mockImplementation(() => ({
    loadFromCluster: mockLoadFromCluster,
    loadFromDefault: mockLoadFromDefault,
    makeApiClient: mockMakeApiClient,
  })),
  BatchV1Api: jest.fn(),
}));

const baseConfig: RunSpawnConfig = {
  runId: 'run-k8s-1',
  repoUrl: 'https://github.com/org/repo',
  branch: 'main',
  testDirectory: 'tests',
  testFile: 'auth.spec.ts',
  testName: 'should login',
  baseUrl: 'http://localhost:3000',
};

function makeConfigService(overrides: Record<string, unknown> = {}): ConfigService {
  const defaults: Record<string, unknown> = {
    K8S_NAMESPACE: 'veriflow',
    K8S_RUNNER_IMAGE: 'registry/veriflow-runner:latest',
    K8S_SERVICE_ACCOUNT: 'veriflow-runner',
    K8S_JOB_TTL_SECONDS: 300,
    VERIFLOW_API_URL: 'http://server:3001/api/v1',
    WORKER_API_KEY: 'test-key',
  };
  const map = { ...defaults, ...overrides };
  return { get: jest.fn((key: string, def?: unknown) => map[key] ?? def) } as unknown as ConfigService;
}

type JobCall = {
  namespace: string;
  body: {
    metadata: { generateName: string; labels: Record<string, string> };
    spec: {
      ttlSecondsAfterFinished: number;
      backoffLimit: number;
      template: {
        spec: {
          restartPolicy: string;
          serviceAccountName: string;
          containers: Array<{ env: Array<{ name: string; value: string }> }>;
        };
      };
    };
  };
};

describe('K8sRunSpawnerService', () => {
  let service: K8sRunSpawnerService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Re-set defaults after clearAllMocks resets implementations
    mockCreateNamespacedJob.mockResolvedValue({});
    mockMakeApiClient.mockReturnValue({ createNamespacedJob: mockCreateNamespacedJob });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        K8sRunSpawnerService,
        { provide: ConfigService, useValue: makeConfigService() },
      ],
    }).compile();

    service = module.get(K8sRunSpawnerService);
  });

  it('creates a namespaced Job with required spec and env vars', async () => {
    await service.spawn(baseConfig);

    expect(mockCreateNamespacedJob).toHaveBeenCalledTimes(1);
    const call = mockCreateNamespacedJob.mock.calls[0][0] as JobCall;

    expect(call.namespace).toBe('veriflow');
    expect(call.body.metadata.generateName).toBe('veriflow-runner-');
    expect(call.body.metadata.labels['veriflow-run-id']).toBe('run-k8s-1');
    expect(call.body.spec.ttlSecondsAfterFinished).toBe(300);
    expect(call.body.spec.backoffLimit).toBe(0);
    expect(call.body.spec.template.spec.restartPolicy).toBe('Never');
    expect(call.body.spec.template.spec.serviceAccountName).toBe('veriflow-runner');

    const env = call.body.spec.template.spec.containers[0].env;
    expect(env).toContainEqual({ name: 'VERIFLOW_RUN_ID', value: 'run-k8s-1' });
    expect(env).toContainEqual({ name: 'VERIFLOW_API_URL', value: 'http://server:3001/api/v1' });
    expect(env).toContainEqual({ name: 'WORKER_API_KEY', value: 'test-key' });
  });

  it('uses configured ttlSecondsAfterFinished', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        K8sRunSpawnerService,
        { provide: ConfigService, useValue: makeConfigService({ K8S_JOB_TTL_SECONDS: 600 }) },
      ],
    }).compile();
    const svc = module.get(K8sRunSpawnerService);
    await svc.spawn(baseConfig);

    const call = mockCreateNamespacedJob.mock.calls[0][0] as JobCall;
    expect(call.body.spec.ttlSecondsAfterFinished).toBe(600);
  });

  it('includes optional env vars when provided', async () => {
    await service.spawn({ ...baseConfig, playwrightConfig: 'playwright.config.ts', authToken: 'gh-token' });

    const call = mockCreateNamespacedJob.mock.calls[0][0] as JobCall;
    const env = call.body.spec.template.spec.containers[0].env;
    expect(env).toContainEqual({ name: 'VERIFLOW_PLAYWRIGHT_CONFIG', value: 'playwright.config.ts' });
    expect(env).toContainEqual({ name: 'VERIFLOW_AUTH_TOKEN', value: 'gh-token' });
  });

  it('omits optional env vars when not provided', async () => {
    await service.spawn(baseConfig);

    const call = mockCreateNamespacedJob.mock.calls[0][0] as JobCall;
    const names = call.body.spec.template.spec.containers[0].env.map((e) => e.name);
    expect(names).not.toContain('VERIFLOW_PLAYWRIGHT_CONFIG');
    expect(names).not.toContain('VERIFLOW_AUTH_TOKEN');
  });

  it('falls back to loadFromDefault when loadFromCluster throws', async () => {
    mockLoadFromCluster.mockImplementationOnce(() => { throw new Error('not in cluster'); });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        K8sRunSpawnerService,
        { provide: ConfigService, useValue: makeConfigService() },
      ],
    }).compile();

    const svc = module.get(K8sRunSpawnerService);
    await svc.spawn(baseConfig);

    expect(mockLoadFromDefault).toHaveBeenCalled();
  });

  it('throws when both loadFromCluster and loadFromDefault fail', async () => {
    mockLoadFromCluster.mockImplementationOnce(() => { throw new Error('not in cluster'); });
    mockLoadFromDefault.mockImplementationOnce(() => { throw new Error('no kubeconfig found'); });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        K8sRunSpawnerService,
        { provide: ConfigService, useValue: makeConfigService() },
      ],
    }).compile();

    const svc = module.get(K8sRunSpawnerService);
    await expect(svc.spawn(baseConfig)).rejects.toThrow('no kubeconfig found');
  });

  it('caches the BatchV1Api after first spawn', async () => {
    await service.spawn(baseConfig);
    await service.spawn(baseConfig);

    expect(mockMakeApiClient).toHaveBeenCalledTimes(1);
  });

  it('throws when createNamespacedJob fails', async () => {
    mockCreateNamespacedJob.mockRejectedValueOnce(new Error('k8s API error'));
    await expect(service.spawn(baseConfig)).rejects.toThrow('k8s API error');
  });
});

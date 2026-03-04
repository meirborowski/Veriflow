import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type * as k8s from '@kubernetes/client-node';
import { RunSpawnerService, RunSpawnConfig } from '../run-spawner.service';

// Loaded lazily via dynamic import to avoid require() on this ESM-only package.
type BatchV1Api = k8s.BatchV1Api;
type V1EnvVar = k8s.V1EnvVar;

@Injectable()
export class K8sRunSpawnerService extends RunSpawnerService {
  private readonly logger = new Logger(K8sRunSpawnerService.name);
  private readonly namespace: string;
  private readonly runnerImage: string;
  private readonly serviceAccount: string;
  private readonly ttlSeconds: number;
  private readonly apiUrl: string;
  private readonly workerApiKey: string;

  private cachedApi: BatchV1Api | null = null;

  constructor(private readonly config: ConfigService) {
    super();
    this.namespace = config.get<string>('K8S_NAMESPACE', 'veriflow');
    this.runnerImage = config.get<string>('K8S_RUNNER_IMAGE', 'veriflow-runner:latest');
    this.serviceAccount = config.get<string>('K8S_SERVICE_ACCOUNT', 'veriflow-runner');
    this.ttlSeconds = config.get<number>('K8S_JOB_TTL_SECONDS', 300);
    this.apiUrl = config.get<string>('VERIFLOW_API_URL', 'http://localhost:3001/api/v1');
    this.workerApiKey = config.get<string>('WORKER_API_KEY', '');
  }

  async spawn(config: RunSpawnConfig): Promise<void> {
    const batchApi = await this.getBatchApi();
    const envVars = this.buildEnvVars(config);

    const job = {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: {
        generateName: 'veriflow-runner-',
        namespace: this.namespace,
        labels: { 'veriflow-run-id': config.runId },
      },
      spec: {
        ttlSecondsAfterFinished: this.ttlSeconds,
        backoffLimit: 0,
        template: {
          spec: {
            restartPolicy: 'Never',
            serviceAccountName: this.serviceAccount,
            containers: [
              {
                name: 'runner',
                image: this.runnerImage,
                env: envVars,
              },
            ],
          },
        },
      },
    };

    await batchApi.createNamespacedJob({ namespace: this.namespace, body: job });
    this.logger.log(`Spawned k8s Job for run ${config.runId} in namespace ${this.namespace}`);
  }

  private async getBatchApi(): Promise<BatchV1Api> {
    if (this.cachedApi) return this.cachedApi;

    const k8sLib = await import('@kubernetes/client-node');
    const kc = new k8sLib.KubeConfig();
    try {
      kc.loadFromCluster();
    } catch {
      kc.loadFromDefault();
    }
    this.cachedApi = kc.makeApiClient(k8sLib.BatchV1Api);
    return this.cachedApi;
  }

  private buildEnvVars(config: RunSpawnConfig): V1EnvVar[] {
    const required: Array<[string, string]> = [
      ['VERIFLOW_RUN_ID', config.runId],
      ['VERIFLOW_REPO_URL', config.repoUrl],
      ['VERIFLOW_BRANCH', config.branch],
      ['VERIFLOW_TEST_DIRECTORY', config.testDirectory],
      ['VERIFLOW_TEST_FILE', config.testFile],
      ['VERIFLOW_TEST_NAME', config.testName],
      ['VERIFLOW_BASE_URL', config.baseUrl],
      ['VERIFLOW_API_URL', this.apiUrl],
      ['WORKER_API_KEY', this.workerApiKey],
    ];

    const envVars: V1EnvVar[] = required.map(([name, value]) => ({ name, value }));

    if (config.playwrightConfig) {
      envVars.push({ name: 'VERIFLOW_PLAYWRIGHT_CONFIG', value: config.playwrightConfig });
    }
    if (config.authToken) {
      envVars.push({ name: 'VERIFLOW_AUTH_TOKEN', value: config.authToken });
    }

    return envVars;
  }
}

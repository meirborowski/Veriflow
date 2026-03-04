import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Dockerode from 'dockerode';
import { RunSpawnerService, RunSpawnConfig } from '../run-spawner.service';

@Injectable()
export class DockerRunSpawnerService extends RunSpawnerService {
  private readonly logger = new Logger(DockerRunSpawnerService.name);
  private readonly docker: Dockerode;
  private readonly runnerImage: string;
  private readonly networkName: string;
  private readonly apiUrl: string;
  private readonly workerApiKey: string;

  constructor(private readonly config: ConfigService) {
    super();
    const socketPath = config.get<string>('DOCKER_SOCKET', '/var/run/docker.sock');
    this.docker = new Dockerode({ socketPath });
    this.runnerImage = config.get<string>('RUNNER_IMAGE', 'veriflow-runner:latest');
    this.networkName = config.get<string>('DOCKER_NETWORK', 'veriflow');
    this.apiUrl = config.get<string>('VERIFLOW_API_URL', 'http://localhost:3001/api/v1');
    this.workerApiKey = config.get<string>('WORKER_API_KEY', '');
  }

  async spawn(config: RunSpawnConfig): Promise<void> {
    const env = this.buildEnv(config);

    const container = await this.docker.createContainer({
      Image: this.runnerImage,
      Env: env,
      HostConfig: {
        AutoRemove: true,
        NetworkMode: this.networkName,
      },
    });

    await container.start();
    this.logger.log(`Spawned Docker container for run ${config.runId}`);
  }

  private buildEnv(config: RunSpawnConfig): string[] {
    const vars: Record<string, string> = {
      VERIFLOW_RUN_ID: config.runId,
      VERIFLOW_REPO_URL: config.repoUrl,
      VERIFLOW_BRANCH: config.branch,
      VERIFLOW_TEST_DIRECTORY: config.testDirectory,
      VERIFLOW_TEST_FILE: config.testFile,
      VERIFLOW_TEST_NAME: config.testName,
      VERIFLOW_BASE_URL: config.baseUrl,
      VERIFLOW_API_URL: this.apiUrl,
      WORKER_API_KEY: this.workerApiKey,
    };

    if (config.playwrightConfig) {
      vars['VERIFLOW_PLAYWRIGHT_CONFIG'] = config.playwrightConfig;
    }
    if (config.authToken) {
      vars['VERIFLOW_AUTH_TOKEN'] = config.authToken;
    }

    return Object.entries(vars).map(([k, v]) => `${k}=${v}`);
  }
}

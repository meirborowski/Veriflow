export interface RunSpawnConfig {
  runId: string;
  repoUrl: string;
  branch: string;
  testDirectory: string;
  testFile: string;
  testName: string;
  baseUrl: string;
  playwrightConfig?: string | null;
  authToken?: string | null;
}

export abstract class RunSpawnerService {
  abstract spawn(config: RunSpawnConfig): Promise<void>;
}

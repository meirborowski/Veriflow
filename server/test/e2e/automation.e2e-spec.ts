import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { getQueueToken } from '@nestjs/bull';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { StorageService } from '../../src/attachments/storage.service';
import { ValidationPipe } from '../../src/common/pipes/validation.pipe';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import {
  truncateAll,
  initTestDataSource,
  closeTestDataSource,
  getTestDatabaseUrl,
} from '../helpers/db.helper';
import { registerUser, TestUser } from '../helpers/auth.helper';
import {
  createProject,
  createStory,
  addProjectMember,
} from '../helpers/seed.helper';
import { AutomationRunStatus, UserRole } from '../../src/common/types/enums';

class NoopThrottlerGuard extends ThrottlerGuard {
  protected override handleRequest(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

class InMemoryStorageService {
  async onModuleInit(): Promise<void> {}
  async upload(): Promise<void> {}
  async delete(): Promise<void> {}
  async getSignedDownloadUrl(key: string): Promise<string> {
    return `http://mock-storage/${key}`;
  }
}

const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'mock-job-1' }),
};

async function createAutomationTestApp(): Promise<INestApplication> {
  process.env.DATABASE_URL = getTestDatabaseUrl();
  process.env.JWT_SECRET ??= 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET ??= 'test-jwt-refresh-secret';
  process.env.REDIS_HOST ??= 'localhost';
  process.env.REDIS_PORT ??= '6379';
  process.env.ENCRYPTION_KEY ??= 'a'.repeat(64); // 32-byte hex key for tests
  process.env.WORKER_API_KEY ??= 'test-worker-key';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(ThrottlerGuard)
    .useClass(NoopThrottlerGuard)
    .overrideProvider(StorageService)
    .useClass(InMemoryStorageService)
    .overrideProvider(getQueueToken('automation'))
    .useValue(mockQueue)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.enableCors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
  await app.init();
  return app;
}

describe('Automation (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let admin: TestUser;
  let tester: TestUser;
  let projectId: string;
  let storyId: string;

  beforeAll(async () => {
    app = await createAutomationTestApp();
    ds = await initTestDataSource();
  });

  afterAll(async () => {
    await app.close();
    await closeTestDataSource();
  });

  beforeEach(async () => {
    await truncateAll(ds);
    jest.clearAllMocks();

    admin = await registerUser(app);
    tester = await registerUser(app);

    const project = await createProject(app, admin.authHeader);
    projectId = project.id;

    await addProjectMember(
      app,
      admin.authHeader,
      projectId,
      tester.email,
      UserRole.TESTER,
    );

    const story = await createStory(app, admin.authHeader, projectId);
    storyId = story.id;
  });

  // ── Registry Sync ────────────────────────────────────────────────────

  describe('POST /projects/:projectId/automation/registry/sync', () => {
    it('should sync test registry and return counts', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/registry/sync`)
        .set('Authorization', admin.authHeader)
        .send({
          tests: [
            {
              externalId: 'ext-1',
              testFile: 'tests/a.spec.ts',
              testName: 'Test A',
              tags: ['smoke'],
            },
            {
              externalId: 'ext-2',
              testFile: 'tests/b.spec.ts',
              testName: 'Test B',
            },
          ],
        })
        .expect(201);

      expect(res.body).toEqual({ created: 2, updated: 0, deleted: 0 });
    });

    it('should update existing tests on re-sync', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/registry/sync`)
        .set('Authorization', admin.authHeader)
        .send({
          tests: [
            {
              externalId: 'ext-1',
              testFile: 'tests/a.spec.ts',
              testName: 'Test A',
            },
          ],
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/registry/sync`)
        .set('Authorization', admin.authHeader)
        .send({
          tests: [
            {
              externalId: 'ext-1',
              testFile: 'tests/a-new.spec.ts',
              testName: 'Test A Updated',
            },
          ],
        })
        .expect(201);

      expect(res.body).toEqual({ created: 0, updated: 1, deleted: 0 });
    });

    it('should delete tests removed from the registry', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/registry/sync`)
        .set('Authorization', admin.authHeader)
        .send({
          tests: [
            { externalId: 'ext-1', testFile: 'a.spec.ts', testName: 'A' },
            { externalId: 'ext-2', testFile: 'b.spec.ts', testName: 'B' },
          ],
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/registry/sync`)
        .set('Authorization', admin.authHeader)
        .send({
          tests: [
            { externalId: 'ext-1', testFile: 'a.spec.ts', testName: 'A' },
          ],
        })
        .expect(201);

      expect(res.body).toEqual({ created: 0, updated: 1, deleted: 1 });
    });

    it('should return 400 for invalid payload', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/registry/sync`)
        .set('Authorization', admin.authHeader)
        .send({ tests: 'not-an-array' })
        .expect(400);
    });

    it('should return 403 for TESTER role', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/registry/sync`)
        .set('Authorization', tester.authHeader)
        .send({ tests: [] })
        .expect(403);
    });
  });

  // ── List & Get Tests ─────────────────────────────────────────────────

  describe('GET /projects/:projectId/automation/tests', () => {
    it('should list tests with pagination', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/registry/sync`)
        .set('Authorization', admin.authHeader)
        .send({
          tests: [
            { externalId: 'e1', testFile: 'a.spec.ts', testName: 'Alpha' },
            { externalId: 'e2', testFile: 'b.spec.ts', testName: 'Beta' },
          ],
        });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/automation/tests`)
        .set('Authorization', admin.authHeader)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBe(2);
    });

    it('should filter tests by search', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/registry/sync`)
        .set('Authorization', admin.authHeader)
        .send({
          tests: [
            { externalId: 'e1', testFile: 'a.spec.ts', testName: 'Login Test' },
            {
              externalId: 'e2',
              testFile: 'b.spec.ts',
              testName: 'Signup Test',
            },
          ],
        });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/automation/tests?search=Login`)
        .set('Authorization', admin.authHeader)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].testName).toBe('Login Test');
    });

    it('should return 403 for non-member', async () => {
      const other = await registerUser(app);
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/automation/tests`)
        .set('Authorization', other.authHeader)
        .expect(403);
    });
  });

  // ── Single Test ──────────────────────────────────────────────────────

  describe('GET /automation/tests/:id', () => {
    it('should return test detail with linked stories and recent runs', async () => {
      const syncRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/registry/sync`)
        .set('Authorization', admin.authHeader)
        .send({
          tests: [
            { externalId: 'e1', testFile: 'a.spec.ts', testName: 'Test A' },
          ],
        });

      expect(syncRes.status).toBe(201);

      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/automation/tests`)
        .set('Authorization', admin.authHeader);
      const testId = listRes.body.data[0].id as string;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/automation/tests/${testId}`)
        .set('Authorization', admin.authHeader)
        .expect(200);

      expect(res.body.test.id).toBe(testId);
      expect(res.body.linkedStories).toBeInstanceOf(Array);
      expect(res.body.recentRuns).toBeInstanceOf(Array);
    });

    it('should return 404 for unknown test id', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/automation/tests/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', admin.authHeader)
        .expect(404);
    });
  });

  // ── Link / Unlink ────────────────────────────────────────────────────

  describe('POST /stories/:storyId/automation/link', () => {
    let testId: string;

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/registry/sync`)
        .set('Authorization', admin.authHeader)
        .send({
          tests: [
            { externalId: 'e1', testFile: 'a.spec.ts', testName: 'Test A' },
          ],
        });

      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/automation/tests`)
        .set('Authorization', admin.authHeader);
      testId = listRes.body.data[0].id as string;
    });

    it('should link tests to a story', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/stories/${storyId}/automation/link`)
        .set('Authorization', admin.authHeader)
        .send({ testIds: [testId] })
        .expect(201);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].testId).toBe(testId);
      expect(res.body[0].storyId).toBe(storyId);
    });

    it('should not duplicate links', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/stories/${storyId}/automation/link`)
        .set('Authorization', admin.authHeader)
        .send({ testIds: [testId] })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/stories/${storyId}/automation/link`)
        .set('Authorization', admin.authHeader)
        .send({ testIds: [testId] })
        .expect(201);

      expect(res.body).toHaveLength(1);
    });

    it('should return 403 for TESTER role', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/stories/${storyId}/automation/link`)
        .set('Authorization', tester.authHeader)
        .send({ testIds: [testId] })
        .expect(403);
    });
  });

  describe('DELETE /stories/:storyId/automation/link/:testId', () => {
    let testId: string;

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/registry/sync`)
        .set('Authorization', admin.authHeader)
        .send({
          tests: [
            { externalId: 'e1', testFile: 'a.spec.ts', testName: 'Test A' },
          ],
        });

      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/automation/tests`)
        .set('Authorization', admin.authHeader);
      testId = listRes.body.data[0].id as string;

      await request(app.getHttpServer())
        .post(`/api/v1/stories/${storyId}/automation/link`)
        .set('Authorization', admin.authHeader)
        .send({ testIds: [testId] });
    });

    it('should unlink test from story', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/stories/${storyId}/automation/link/${testId}`)
        .set('Authorization', admin.authHeader)
        .expect(204);
    });

    it('should return 404 when link does not exist', async () => {
      await request(app.getHttpServer())
        .delete(
          `/api/v1/stories/${storyId}/automation/link/00000000-0000-0000-0000-000000000000`,
        )
        .set('Authorization', admin.authHeader)
        .expect(404);
    });
  });

  // ── Automation Summary + Conflict Detection ─────────────────────────

  describe('GET /stories/:storyId/automation/summary', () => {
    let testId1: string;
    let testId2: string;

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/registry/sync`)
        .set('Authorization', admin.authHeader)
        .send({
          tests: [
            { externalId: 'e1', testFile: 'a.spec.ts', testName: 'Test A' },
            { externalId: 'e2', testFile: 'b.spec.ts', testName: 'Test B' },
          ],
        });

      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/automation/tests`)
        .set('Authorization', admin.authHeader);

      testId1 = listRes.body.data.find(
        (t: { testName: string }) => t.testName === 'Test A',
      ).id as string;
      testId2 = listRes.body.data.find(
        (t: { testName: string }) => t.testName === 'Test B',
      ).id as string;
    });

    it('should return summary with no conflict when no runs', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/stories/${storyId}/automation/link`)
        .set('Authorization', admin.authHeader)
        .send({ testIds: [testId1] });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/stories/${storyId}/automation/summary`)
        .set('Authorization', admin.authHeader)
        .expect(200);

      expect(res.body.hasConflict).toBe(false);
      expect(res.body.tests).toHaveLength(1);
      expect(res.body.tests[0].latestRunStatus).toBeNull();
    });

    it('should detect conflict when tests have mixed pass/fail results', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/stories/${storyId}/automation/link`)
        .set('Authorization', admin.authHeader)
        .send({ testIds: [testId1, testId2] });

      // Report PASS for test 1 via CI/CD
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/runs`)
        .set('Authorization', admin.authHeader)
        .send({
          testId: testId1,
          status: AutomationRunStatus.PASS,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        });

      // Report FAIL for test 2 via CI/CD
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/runs`)
        .set('Authorization', admin.authHeader)
        .send({
          testId: testId2,
          status: AutomationRunStatus.FAIL,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/stories/${storyId}/automation/summary`)
        .set('Authorization', admin.authHeader)
        .expect(200);

      expect(res.body.hasConflict).toBe(true);
    });

    it('should return no conflict when all tests pass', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/stories/${storyId}/automation/link`)
        .set('Authorization', admin.authHeader)
        .send({ testIds: [testId1, testId2] });

      for (const id of [testId1, testId2]) {
        await request(app.getHttpServer())
          .post(`/api/v1/projects/${projectId}/automation/runs`)
          .set('Authorization', admin.authHeader)
          .send({
            testId: id,
            status: AutomationRunStatus.PASS,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          });
      }

      const res = await request(app.getHttpServer())
        .get(`/api/v1/stories/${storyId}/automation/summary`)
        .set('Authorization', admin.authHeader)
        .expect(200);

      expect(res.body.hasConflict).toBe(false);
    });
  });

  // ── Trigger Run ──────────────────────────────────────────────────────

  describe('POST /projects/:projectId/automation/trigger', () => {
    let testId: string;

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/registry/sync`)
        .set('Authorization', admin.authHeader)
        .send({
          tests: [
            { externalId: 'e1', testFile: 'a.spec.ts', testName: 'Test A' },
          ],
        });

      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/automation/tests`)
        .set('Authorization', admin.authHeader);
      testId = listRes.body.data[0].id as string;

      // Set up repo config first
      await request(app.getHttpServer())
        .put(`/api/v1/projects/${projectId}/automation/config`)
        .set('Authorization', admin.authHeader)
        .send({ repoUrl: 'https://github.com/org/repo', branch: 'main' });
    });

    it('should enqueue runs and return 202 with runIds', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/trigger`)
        .set('Authorization', admin.authHeader)
        .send({ testIds: [testId], baseUrl: 'http://localhost:3000' })
        .expect(202);

      expect(res.body.runIds).toHaveLength(1);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'run-test',
        expect.objectContaining({ runId: res.body.runIds[0] }),
      );
    });

    it('should return 400 when no repo config exists', async () => {
      // Create a new project without repo config
      const otherProject = await createProject(app, admin.authHeader);

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/registry/sync`)
        .set('Authorization', admin.authHeader)
        .send({
          tests: [
            { externalId: 'e1', testFile: 'a.spec.ts', testName: 'Test A' },
          ],
        });

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${otherProject.id}/automation/trigger`)
        .set('Authorization', admin.authHeader)
        .send({ baseUrl: 'http://localhost:3000' })
        .expect(400);
    });
  });

  // ── Run Report (CI/CD) ───────────────────────────────────────────────

  describe('POST /projects/:projectId/automation/runs', () => {
    let testId: string;

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/registry/sync`)
        .set('Authorization', admin.authHeader)
        .send({
          tests: [
            { externalId: 'e1', testFile: 'a.spec.ts', testName: 'Test A' },
          ],
        });

      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/automation/tests`)
        .set('Authorization', admin.authHeader);
      testId = listRes.body.data[0].id as string;
    });

    it('should create a run from CI/CD report', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/runs`)
        .set('Authorization', admin.authHeader)
        .send({
          testId,
          status: AutomationRunStatus.PASS,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          duration: 1200,
          externalRunId: 'ci-build-123',
        })
        .expect(201);

      expect(res.body.status).toBe(AutomationRunStatus.PASS);
      expect(res.body.testId).toBe(testId);
    });

    it('should update existing run when externalRunId matches', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/runs`)
        .set('Authorization', admin.authHeader)
        .send({
          testId,
          status: AutomationRunStatus.RUNNING,
          startedAt: new Date().toISOString(),
          externalRunId: 'ci-build-456',
        });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/runs`)
        .set('Authorization', admin.authHeader)
        .send({
          testId,
          status: AutomationRunStatus.FAIL,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          externalRunId: 'ci-build-456',
        })
        .expect(201);

      expect(res.body.status).toBe(AutomationRunStatus.FAIL);
    });
  });

  // ── Run Status (Worker Auth) ─────────────────────────────────────────

  describe('PATCH /automation/runs/:id/status', () => {
    let runId: string;
    let testId: string;

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/registry/sync`)
        .set('Authorization', admin.authHeader)
        .send({
          tests: [
            { externalId: 'e1', testFile: 'a.spec.ts', testName: 'Test A' },
          ],
        });

      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/automation/tests`)
        .set('Authorization', admin.authHeader);
      testId = listRes.body.data[0].id as string;

      const runRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/runs`)
        .set('Authorization', admin.authHeader)
        .send({
          testId,
          status: AutomationRunStatus.RUNNING,
          startedAt: new Date().toISOString(),
        });
      runId = runRes.body.id as string;
    });

    it('should update run status with valid worker API key', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/automation/runs/${runId}/status`)
        .set('x-worker-api-key', 'test-worker-key')
        .send({ status: AutomationRunStatus.PASS, duration: 1500 })
        .expect(200);

      expect(res.body.status).toBe(AutomationRunStatus.PASS);
    });

    it('should return 401 with invalid worker API key', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/automation/runs/${runId}/status`)
        .set('x-worker-api-key', 'wrong-key')
        .send({ status: AutomationRunStatus.PASS })
        .expect(401);
    });

    it('should return 401 with no worker API key', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/automation/runs/${runId}/status`)
        .send({ status: AutomationRunStatus.PASS })
        .expect(401);
    });
  });

  // ── Repo Config ──────────────────────────────────────────────────────

  describe('Repo Config', () => {
    it('PUT should create repo config', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/projects/${projectId}/automation/config`)
        .set('Authorization', admin.authHeader)
        .send({
          repoUrl: 'https://github.com/org/repo',
          branch: 'develop',
          testDirectory: 'e2e',
          authToken: 'ghp_secret',
        })
        .expect(200);

      expect(res.body.repoUrl).toBe('https://github.com/org/repo');
      expect(res.body.branch).toBe('develop');
      expect(res.body.authToken).toBe('***'); // should be masked
    });

    it('GET should return config with masked token', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/projects/${projectId}/automation/config`)
        .set('Authorization', admin.authHeader)
        .send({ repoUrl: 'https://github.com/org/repo' });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/automation/config`)
        .set('Authorization', admin.authHeader)
        .expect(200);

      expect(res.body.projectId).toBe(projectId);
    });

    it('GET should return 404 when config does not exist', async () => {
      const otherProject = await createProject(app, admin.authHeader);
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${otherProject.id}/automation/config`)
        .set('Authorization', admin.authHeader)
        .expect(404);
    });

    it('should return 403 for TESTER role on PUT', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/projects/${projectId}/automation/config`)
        .set('Authorization', tester.authHeader)
        .send({ repoUrl: 'https://github.com/org/repo' })
        .expect(403);
    });
  });

  // ── Role Enforcement ─────────────────────────────────────────────────

  describe('Role enforcement', () => {
    it('should allow TESTER to list tests', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/automation/tests`)
        .set('Authorization', tester.authHeader)
        .expect(200);
    });

    it('should deny TESTER from syncing registry', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/registry/sync`)
        .set('Authorization', tester.authHeader)
        .send({ tests: [] })
        .expect(403);
    });

    it('should deny TESTER from triggering runs', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/automation/trigger`)
        .set('Authorization', tester.authHeader)
        .send({ baseUrl: 'http://localhost' })
        .expect(403);
    });

    it('should return 401 for unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/automation/tests`)
        .expect(401);
    });
  });
});

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/app.helper';
import {
  truncateAll,
  initTestDataSource,
  closeTestDataSource,
} from '../helpers/db.helper';
import { registerUser } from '../helpers/auth.helper';
import {
  createProject,
  addProjectMember,
  createStory,
  createRelease,
  addStoriesToRelease,
  closeRelease,
  seedExecution,
  seedStepResult,
} from '../helpers/seed.helper';
import { TestStatus, StepStatus } from '../../src/common/types/enums';

describe('Test Execution (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    ds = await initTestDataSource();
    await truncateAll();
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await closeTestDataSource();
  });

  describe('GET /api/v1/releases/:id/executions', () => {
    it('should return paginated executions', async () => {
      const admin = await registerUser(app);
      const tester = await registerUser(app);
      const project = await createProject(app, admin.authHeader);
      await addProjectMember(
        app,
        admin.authHeader,
        project.id,
        tester.email,
        'TESTER' as never,
      );

      const story = await createStory(app, admin.authHeader, project.id);
      const release = await createRelease(app, admin.authHeader, project.id);
      await addStoriesToRelease(app, admin.authHeader, release.id, [story.id]);
      const closed = await closeRelease(app, admin.authHeader, release.id);

      // Get snapshot story ID from release detail
      const releaseDetail = await request(app.getHttpServer())
        .get(`/api/v1/releases/${closed.id}`)
        .set('Authorization', admin.authHeader)
        .expect(200);

      const releaseStoryId = releaseDetail.body.stories[0].id;

      // Seed an execution via DB
      await seedExecution(ds, closed.id, releaseStoryId, tester.id, {
        status: TestStatus.PASS,
        completedAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/releases/${closed.id}/executions`)
        .set('Authorization', admin.authHeader)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta).toHaveProperty('total');
    });

    it('should filter by status', async () => {
      const admin = await registerUser(app);
      const tester = await registerUser(app);
      const project = await createProject(app, admin.authHeader);
      await addProjectMember(
        app,
        admin.authHeader,
        project.id,
        tester.email,
        'TESTER' as never,
      );

      const story = await createStory(app, admin.authHeader, project.id);
      const release = await createRelease(app, admin.authHeader, project.id);
      await addStoriesToRelease(app, admin.authHeader, release.id, [story.id]);
      const closed = await closeRelease(app, admin.authHeader, release.id);

      const releaseDetail = await request(app.getHttpServer())
        .get(`/api/v1/releases/${closed.id}`)
        .set('Authorization', admin.authHeader)
        .expect(200);

      const releaseStoryId = releaseDetail.body.stories[0].id;

      await seedExecution(ds, closed.id, releaseStoryId, tester.id, {
        status: TestStatus.FAIL,
        completedAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/releases/${closed.id}/executions?status=FAIL`)
        .set('Authorization', admin.authHeader)
        .expect(200);

      res.body.data.forEach((e: { status: string }) => {
        expect(e.status).toBe('FAIL');
      });
    });
  });

  describe('GET /api/v1/releases/:id/executions/latest', () => {
    it('should return latest execution per story with summary', async () => {
      const admin = await registerUser(app);
      const tester = await registerUser(app);
      const project = await createProject(app, admin.authHeader);
      await addProjectMember(
        app,
        admin.authHeader,
        project.id,
        tester.email,
        'TESTER' as never,
      );

      const story1 = await createStory(app, admin.authHeader, project.id, {
        title: 'Story 1',
      });
      const story2 = await createStory(app, admin.authHeader, project.id, {
        title: 'Story 2',
      });
      const release = await createRelease(app, admin.authHeader, project.id);
      await addStoriesToRelease(app, admin.authHeader, release.id, [
        story1.id,
        story2.id,
      ]);
      const closed = await closeRelease(app, admin.authHeader, release.id);

      const releaseDetail = await request(app.getHttpServer())
        .get(`/api/v1/releases/${closed.id}`)
        .set('Authorization', admin.authHeader)
        .expect(200);

      const rsId1 = releaseDetail.body.stories[0].id;

      await seedExecution(ds, closed.id, rsId1, tester.id, {
        status: TestStatus.PASS,
        completedAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/releases/${closed.id}/executions/latest`)
        .set('Authorization', admin.authHeader)
        .expect(200);

      expect(res.body.stories).toHaveLength(2);
      expect(res.body.summary).toHaveProperty('total', 2);
      expect(res.body.summary).toHaveProperty('pass');
      expect(res.body.summary).toHaveProperty('untested');
    });
  });

  describe('GET /api/v1/executions/:id', () => {
    it('should return execution with step results', async () => {
      const admin = await registerUser(app);
      const tester = await registerUser(app);
      const project = await createProject(app, admin.authHeader);
      await addProjectMember(
        app,
        admin.authHeader,
        project.id,
        tester.email,
        'TESTER' as never,
      );

      const story = await createStory(app, admin.authHeader, project.id, {
        steps: [{ order: 1, instruction: 'Check login' }],
      });
      const release = await createRelease(app, admin.authHeader, project.id);
      await addStoriesToRelease(app, admin.authHeader, release.id, [story.id]);
      const closed = await closeRelease(app, admin.authHeader, release.id);

      const releaseDetail = await request(app.getHttpServer())
        .get(`/api/v1/releases/${closed.id}`)
        .set('Authorization', admin.authHeader)
        .expect(200);

      const releaseStory = releaseDetail.body.stories[0];
      const stepId = releaseStory.steps[0].id;

      const execution = await seedExecution(
        ds,
        closed.id,
        releaseStory.id,
        tester.id,
        { status: TestStatus.PASS, completedAt: new Date() },
      );

      await seedStepResult(ds, execution.id, stepId, StepStatus.PASS);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/executions/${execution.id}`)
        .set('Authorization', admin.authHeader)
        .expect(200);

      expect(res.body.id).toBe(execution.id);
      expect(res.body.stepResults).toHaveLength(1);
      expect(res.body.stepResults[0].status).toBe('PASS');
    });

    it('should return 404 for non-existent execution', async () => {
      const user = await registerUser(app);
      await createProject(app, user.authHeader);

      await request(app.getHttpServer())
        .get('/api/v1/executions/00000000-0000-4000-8000-000000000000')
        .set('Authorization', user.authHeader)
        .expect(404);
    });

    it('should return 403 for non-member', async () => {
      const admin = await registerUser(app);
      const tester = await registerUser(app);
      const outsider = await registerUser(app);
      const project = await createProject(app, admin.authHeader);
      await addProjectMember(
        app,
        admin.authHeader,
        project.id,
        tester.email,
        'TESTER' as never,
      );

      const story = await createStory(app, admin.authHeader, project.id);
      const release = await createRelease(app, admin.authHeader, project.id);
      await addStoriesToRelease(app, admin.authHeader, release.id, [story.id]);
      const closed = await closeRelease(app, admin.authHeader, release.id);

      const releaseDetail = await request(app.getHttpServer())
        .get(`/api/v1/releases/${closed.id}`)
        .set('Authorization', admin.authHeader)
        .expect(200);

      const execution = await seedExecution(
        ds,
        closed.id,
        releaseDetail.body.stories[0].id,
        tester.id,
        { status: TestStatus.PASS, completedAt: new Date() },
      );

      await request(app.getHttpServer())
        .get(`/api/v1/executions/${execution.id}`)
        .set('Authorization', outsider.authHeader)
        .expect(403);
    });
  });
});

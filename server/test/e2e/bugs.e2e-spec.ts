import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/app.helper';
import {
  truncateAll,
  initTestDataSource,
  closeTestDataSource,
} from '../helpers/db.helper';
import { registerUser, TestUser } from '../helpers/auth.helper';
import {
  createProject,
  addProjectMember,
  createStory,
  createRelease,
  addStoriesToRelease,
  closeRelease,
  seedExecution,
} from '../helpers/seed.helper';
import { TestStatus } from '../../src/common/types/enums';

describe('Bugs (e2e)', () => {
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

  async function setupProjectWithStory(user: TestUser) {
    const project = await createProject(app, user.authHeader);
    const story = await createStory(app, user.authHeader, project.id);
    return { project, story };
  }

  describe('POST /api/v1/projects/:projectId/bugs', () => {
    it('should create a bug linked to story', async () => {
      const user = await registerUser(app);
      const { project, story } = await setupProjectWithStory(user);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/bugs`)
        .set('Authorization', user.authHeader)
        .send({
          storyId: story.id,
          title: 'Login button broken',
          description: 'Clicking login does nothing',
          severity: 'MAJOR',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Login button broken');
      expect(res.body.severity).toBe('MAJOR');
      expect(res.body.status).toBe('OPEN');
      expect(res.body.storyId).toBe(story.id);
      expect(res.body.reportedById).toBe(user.id);
    });

    it('should create a bug linked to execution', async () => {
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

      const execution = await seedExecution(
        ds,
        closed.id,
        releaseDetail.body.stories[0].id,
        tester.id,
        { status: TestStatus.FAIL, completedAt: new Date() },
      );

      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/bugs`)
        .set('Authorization', admin.authHeader)
        .send({
          storyId: story.id,
          executionId: execution.id,
          title: 'Failed test bug',
          description: 'Test failed during execution',
          severity: 'CRITICAL',
        })
        .expect(201);

      expect(res.body.executionId).toBe(execution.id);
    });

    it('should return 404 for story not in project', async () => {
      const user1 = await registerUser(app);
      const user2 = await registerUser(app);
      const project1 = await createProject(app, user1.authHeader);
      const project2 = await createProject(app, user2.authHeader);
      const story = await createStory(app, user1.authHeader, project1.id);

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${project2.id}/bugs`)
        .set('Authorization', user2.authHeader)
        .send({
          storyId: story.id,
          title: 'Wrong project',
          description: 'Cross-project bug',
          severity: 'MINOR',
        })
        .expect(404);
    });
  });

  describe('GET /api/v1/projects/:projectId/bugs', () => {
    it('should return paginated bugs with filters', async () => {
      const user = await registerUser(app);
      const { project, story } = await setupProjectWithStory(user);

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/bugs`)
        .set('Authorization', user.authHeader)
        .send({
          storyId: story.id,
          title: 'Bug A',
          description: 'Description A',
          severity: 'MAJOR',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/bugs`)
        .set('Authorization', user.authHeader)
        .send({
          storyId: story.id,
          title: 'Bug B',
          description: 'Description B',
          severity: 'TRIVIAL',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${project.id}/bugs`)
        .set('Authorization', user.authHeader)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta).toHaveProperty('total');
    });

    it('should filter by severity', async () => {
      const user = await registerUser(app);
      const { project, story } = await setupProjectWithStory(user);

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/bugs`)
        .set('Authorization', user.authHeader)
        .send({
          storyId: story.id,
          title: 'Critical Bug',
          description: 'Very bad',
          severity: 'CRITICAL',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${project.id}/bugs?severity=CRITICAL`)
        .set('Authorization', user.authHeader)
        .expect(200);

      res.body.data.forEach((b: { severity: string }) => {
        expect(b.severity).toBe('CRITICAL');
      });
    });

    it('should filter by status', async () => {
      const user = await registerUser(app);
      const { project } = await setupProjectWithStory(user);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${project.id}/bugs?status=RESOLVED`)
        .set('Authorization', user.authHeader)
        .expect(200);

      res.body.data.forEach((b: { status: string }) => {
        expect(b.status).toBe('RESOLVED');
      });
    });
  });

  describe('GET /api/v1/bugs/:id', () => {
    it('should return bug with full relations', async () => {
      const user = await registerUser(app);
      const { project, story } = await setupProjectWithStory(user);

      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/bugs`)
        .set('Authorization', user.authHeader)
        .send({
          storyId: story.id,
          title: 'Detail Bug',
          description: 'For detail test',
          severity: 'MINOR',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/bugs/${createRes.body.id}`)
        .set('Authorization', user.authHeader)
        .expect(200);

      expect(res.body.id).toBe(createRes.body.id);
      expect(res.body).toHaveProperty('story');
      expect(res.body).toHaveProperty('reportedBy');
    });
  });

  describe('PATCH /api/v1/bugs/:id', () => {
    it('should update bug status and severity', async () => {
      const user = await registerUser(app);
      const { project, story } = await setupProjectWithStory(user);

      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/bugs`)
        .set('Authorization', user.authHeader)
        .send({
          storyId: story.id,
          title: 'Update Bug',
          description: 'Will be updated',
          severity: 'MINOR',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/bugs/${createRes.body.id}`)
        .set('Authorization', user.authHeader)
        .send({ status: 'RESOLVED', severity: 'MAJOR' })
        .expect(200);

      expect(res.body.status).toBe('RESOLVED');
      expect(res.body.severity).toBe('MAJOR');
    });

    it('should assign bug to a project member', async () => {
      const admin = await registerUser(app);
      const dev = await registerUser(app);
      const project = await createProject(app, admin.authHeader);
      await addProjectMember(
        app,
        admin.authHeader,
        project.id,
        dev.email,
        'DEVELOPER' as never,
      );

      const story = await createStory(app, admin.authHeader, project.id);

      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/bugs`)
        .set('Authorization', admin.authHeader)
        .send({
          storyId: story.id,
          title: 'Assign Bug',
          description: 'Will be assigned',
          severity: 'MINOR',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/bugs/${createRes.body.id}`)
        .set('Authorization', admin.authHeader)
        .send({ assignedToId: dev.id })
        .expect(200);

      expect(res.body.assignedToId).toBe(dev.id);
    });

    it('should return 400 for assigning to non-member', async () => {
      const admin = await registerUser(app);
      const outsider = await registerUser(app);
      const { project, story } = await setupProjectWithStory(admin);

      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/bugs`)
        .set('Authorization', admin.authHeader)
        .send({
          storyId: story.id,
          title: 'Non-member assign',
          description: 'Should fail',
          severity: 'MINOR',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/bugs/${createRes.body.id}`)
        .set('Authorization', admin.authHeader)
        .send({ assignedToId: outsider.id })
        .expect(400);
    });

    it('should return 403 for TESTER', async () => {
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

      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/bugs`)
        .set('Authorization', tester.authHeader)
        .send({
          storyId: story.id,
          title: 'Tester Bug',
          description: 'Tester can create',
          severity: 'MINOR',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/bugs/${createRes.body.id}`)
        .set('Authorization', tester.authHeader)
        .send({ status: 'RESOLVED' })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/bugs/:id', () => {
    it('should delete bug as ADMIN', async () => {
      const admin = await registerUser(app);
      const { project, story } = await setupProjectWithStory(admin);

      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/bugs`)
        .set('Authorization', admin.authHeader)
        .send({
          storyId: story.id,
          title: 'Delete Me',
          description: 'Going away',
          severity: 'TRIVIAL',
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/api/v1/bugs/${createRes.body.id}`)
        .set('Authorization', admin.authHeader)
        .expect(204);
    });

    it('should return 403 for non-admin roles', async () => {
      const admin = await registerUser(app);
      const dev = await registerUser(app);
      const project = await createProject(app, admin.authHeader);
      await addProjectMember(
        app,
        admin.authHeader,
        project.id,
        dev.email,
        'DEVELOPER' as never,
      );

      const story = await createStory(app, admin.authHeader, project.id);

      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/bugs`)
        .set('Authorization', admin.authHeader)
        .send({
          storyId: story.id,
          title: 'Cannot Delete',
          description: 'Dev cannot delete',
          severity: 'MINOR',
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/api/v1/bugs/${createRes.body.id}`)
        .set('Authorization', dev.authHeader)
        .expect(403);
    });
  });
});

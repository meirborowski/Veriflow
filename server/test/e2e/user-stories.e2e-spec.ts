import { INestApplication } from '@nestjs/common';
import request from 'supertest';
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
} from '../helpers/seed.helper';

describe('User Stories (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await initTestDataSource();
    await truncateAll();
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await closeTestDataSource();
  });

  describe('POST /api/v1/projects/:projectId/stories', () => {
    it('should create story with steps', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/stories`)
        .set('Authorization', user.authHeader)
        .send({
          title: 'Login Flow',
          description: 'User can log in',
          priority: 'HIGH',
          steps: [
            { order: 1, instruction: 'Open login page' },
            { order: 2, instruction: 'Enter credentials' },
            { order: 3, instruction: 'Click submit' },
          ],
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Login Flow');
      expect(res.body.priority).toBe('HIGH');
      expect(res.body.steps).toHaveLength(3);
      expect(res.body.steps[0].instruction).toBe('Open login page');
    });

    it('should return 400 for empty steps', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/stories`)
        .set('Authorization', user.authHeader)
        .send({
          title: 'No Steps',
          description: 'Missing steps',
          priority: 'LOW',
          steps: [],
        })
        .expect(400);
    });

    it('should return 403 for TESTER role', async () => {
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

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/stories`)
        .set('Authorization', tester.authHeader)
        .send({
          title: 'Forbidden',
          description: 'Tester cannot create',
          priority: 'LOW',
          steps: [{ order: 1, instruction: 'Step' }],
        })
        .expect(403);
    });
  });

  describe('GET /api/v1/projects/:projectId/stories', () => {
    it('should return paginated stories', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      await createStory(app, user.authHeader, project.id, { title: 'Story A' });
      await createStory(app, user.authHeader, project.id, { title: 'Story B' });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${project.id}/stories`)
        .set('Authorization', user.authHeader)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta).toHaveProperty('total');
    });

    it('should filter by status', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      await createStory(app, user.authHeader, project.id);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${project.id}/stories?status=ACTIVE`)
        .set('Authorization', user.authHeader)
        .expect(200);

      // Default story status is DRAFT, so filtering ACTIVE should return 0
      expect(res.body.data).toHaveLength(0);
    });

    it('should filter by priority', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      await createStory(app, user.authHeader, project.id, {
        priority: 'CRITICAL',
        title: 'Critical Story',
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${project.id}/stories?priority=CRITICAL`)
        .set('Authorization', user.authHeader)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      res.body.data.forEach((s: { priority: string }) => {
        expect(s.priority).toBe('CRITICAL');
      });
    });

    it('should return 403 for non-member', async () => {
      const admin = await registerUser(app);
      const outsider = await registerUser(app);
      const project = await createProject(app, admin.authHeader);

      await request(app.getHttpServer())
        .get(`/api/v1/projects/${project.id}/stories`)
        .set('Authorization', outsider.authHeader)
        .expect(403);
    });
  });

  describe('GET /api/v1/stories/:id', () => {
    it('should return story with ordered steps', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      const story = await createStory(app, user.authHeader, project.id, {
        steps: [
          { order: 2, instruction: 'Second' },
          { order: 1, instruction: 'First' },
        ],
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/stories/${story.id}`)
        .set('Authorization', user.authHeader)
        .expect(200);

      expect(res.body.steps[0].order).toBe(1);
      expect(res.body.steps[1].order).toBe(2);
    });

    it('should return 404 for non-existent story', async () => {
      const user = await registerUser(app);
      // Create project so user has at least some membership
      await createProject(app, user.authHeader);

      await request(app.getHttpServer())
        .get('/api/v1/stories/00000000-0000-4000-8000-000000000000')
        .set('Authorization', user.authHeader)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/stories/:id', () => {
    it('should update title and steps', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      const story = await createStory(app, user.authHeader, project.id);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/stories/${story.id}`)
        .set('Authorization', user.authHeader)
        .send({
          title: 'Updated Title',
          steps: [{ order: 1, instruction: 'New step' }],
        })
        .expect(200);

      expect(res.body.title).toBe('Updated Title');
      expect(res.body.steps).toHaveLength(1);
      expect(res.body.steps[0].instruction).toBe('New step');
    });

    it('should return 400 for empty steps array', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      const story = await createStory(app, user.authHeader, project.id);

      await request(app.getHttpServer())
        .patch(`/api/v1/stories/${story.id}`)
        .set('Authorization', user.authHeader)
        .send({ steps: [] })
        .expect(400);
    });

    it('should return 400 for invalid step IDs', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      const story = await createStory(app, user.authHeader, project.id);

      await request(app.getHttpServer())
        .patch(`/api/v1/stories/${story.id}`)
        .set('Authorization', user.authHeader)
        .send({
          steps: [
            {
              id: '00000000-0000-4000-8000-000000000000',
              order: 1,
              instruction: 'Bad ID',
            },
          ],
        })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/stories/:id', () => {
    it('should delete story as ADMIN', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      const story = await createStory(app, user.authHeader, project.id);

      await request(app.getHttpServer())
        .delete(`/api/v1/stories/${story.id}`)
        .set('Authorization', user.authHeader)
        .expect(204);
    });

    it('should return 403 for DEVELOPER', async () => {
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

      await request(app.getHttpServer())
        .delete(`/api/v1/stories/${story.id}`)
        .set('Authorization', dev.authHeader)
        .expect(403);
    });
  });
});

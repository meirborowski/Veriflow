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
  createRelease,
  addStoriesToRelease,
  closeRelease,
} from '../helpers/seed.helper';

describe('Releases (e2e)', () => {
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

  describe('POST /api/v1/projects/:projectId/releases', () => {
    it('should create a release', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/releases`)
        .set('Authorization', user.authHeader)
        .send({ name: 'v1.0' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('v1.0');
      expect(res.body.status).toBe('DRAFT');
    });

    it('should return 403 for non-admin/pm', async () => {
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

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/releases`)
        .set('Authorization', dev.authHeader)
        .send({ name: 'Forbidden' })
        .expect(403);
    });
  });

  describe('GET /api/v1/projects/:projectId/releases', () => {
    it('should return paginated releases with storyCount', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      const release = await createRelease(app, user.authHeader, project.id);
      const story = await createStory(app, user.authHeader, project.id);
      await addStoriesToRelease(app, user.authHeader, release.id, [story.id]);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${project.id}/releases`)
        .set('Authorization', user.authHeader)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const found = res.body.data.find(
        (r: { id: string }) => r.id === release.id,
      );
      expect(found).toBeDefined();
      expect(found.storyCount).toBe(1);
    });

    it('should filter by status', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      await createRelease(app, user.authHeader, project.id);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${project.id}/releases?status=CLOSED`)
        .set('Authorization', user.authHeader)
        .expect(200);

      res.body.data.forEach((r: { status: string }) => {
        expect(r.status).toBe('CLOSED');
      });
    });
  });

  describe('GET /api/v1/releases/:id', () => {
    it('should return DRAFT release with scoped stories', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      const release = await createRelease(app, user.authHeader, project.id);
      const story = await createStory(app, user.authHeader, project.id, {
        title: 'Scoped Story',
      });
      await addStoriesToRelease(app, user.authHeader, release.id, [story.id]);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/releases/${release.id}`)
        .set('Authorization', user.authHeader)
        .expect(200);

      expect(res.body.status).toBe('DRAFT');
      expect(res.body.stories).toHaveLength(1);
      expect(res.body.stories[0].title).toBe('Scoped Story');
    });

    it('should return CLOSED release with snapshot stories', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      const story = await createStory(app, user.authHeader, project.id, {
        title: 'Snapshot Story',
        steps: [{ order: 1, instruction: 'Do something' }],
      });
      const release = await createRelease(app, user.authHeader, project.id);
      await addStoriesToRelease(app, user.authHeader, release.id, [story.id]);
      await closeRelease(app, user.authHeader, release.id);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/releases/${release.id}`)
        .set('Authorization', user.authHeader)
        .expect(200);

      expect(res.body.status).toBe('CLOSED');
      expect(res.body.stories).toHaveLength(1);
      expect(res.body.stories[0].title).toBe('Snapshot Story');
      expect(res.body.stories[0].steps).toHaveLength(1);
      expect(res.body.stories[0]).toHaveProperty('sourceStoryId');
    });
  });

  describe('POST /api/v1/releases/:id/stories', () => {
    it('should add stories to release', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      const release = await createRelease(app, user.authHeader, project.id);
      const story = await createStory(app, user.authHeader, project.id);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/releases/${release.id}/stories`)
        .set('Authorization', user.authHeader)
        .send({ storyIds: [story.id] })
        .expect(201);

      expect(res.body.added).toBe(1);
    });

    it('should be idempotent — adding same story twice', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      const release = await createRelease(app, user.authHeader, project.id);
      const story = await createStory(app, user.authHeader, project.id);

      await addStoriesToRelease(app, user.authHeader, release.id, [story.id]);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/releases/${release.id}/stories`)
        .set('Authorization', user.authHeader)
        .send({ storyIds: [story.id] })
        .expect(201);

      expect(res.body.added).toBe(0);
    });

    it('should return 409 if release is CLOSED', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      const story1 = await createStory(app, user.authHeader, project.id);
      const story2 = await createStory(app, user.authHeader, project.id);
      const release = await createRelease(app, user.authHeader, project.id);
      await addStoriesToRelease(app, user.authHeader, release.id, [story1.id]);
      await closeRelease(app, user.authHeader, release.id);

      await request(app.getHttpServer())
        .post(`/api/v1/releases/${release.id}/stories`)
        .set('Authorization', user.authHeader)
        .send({ storyIds: [story2.id] })
        .expect(409);
    });
  });

  describe('DELETE /api/v1/releases/:id/stories/:storyId', () => {
    it('should remove story from release', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      const release = await createRelease(app, user.authHeader, project.id);
      const story = await createStory(app, user.authHeader, project.id);
      await addStoriesToRelease(app, user.authHeader, release.id, [story.id]);

      await request(app.getHttpServer())
        .delete(`/api/v1/releases/${release.id}/stories/${story.id}`)
        .set('Authorization', user.authHeader)
        .expect(204);
    });

    it('should return 404 for story not in scope', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      const release = await createRelease(app, user.authHeader, project.id);
      const story = await createStory(app, user.authHeader, project.id);

      await request(app.getHttpServer())
        .delete(`/api/v1/releases/${release.id}/stories/${story.id}`)
        .set('Authorization', user.authHeader)
        .expect(404);
    });

    it('should return 409 if release is CLOSED', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      const story = await createStory(app, user.authHeader, project.id);
      const release = await createRelease(app, user.authHeader, project.id);
      await addStoriesToRelease(app, user.authHeader, release.id, [story.id]);
      await closeRelease(app, user.authHeader, release.id);

      await request(app.getHttpServer())
        .delete(`/api/v1/releases/${release.id}/stories/${story.id}`)
        .set('Authorization', user.authHeader)
        .expect(409);
    });
  });

  describe('POST /api/v1/releases/:id/close', () => {
    it('should close release with snapshot', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      const story = await createStory(app, user.authHeader, project.id, {
        steps: [
          { order: 1, instruction: 'Step 1' },
          { order: 2, instruction: 'Step 2' },
        ],
      });
      const release = await createRelease(app, user.authHeader, project.id);
      await addStoriesToRelease(app, user.authHeader, release.id, [story.id]);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/releases/${release.id}/close`)
        .set('Authorization', user.authHeader)
        .expect(201);

      expect(res.body.status).toBe('CLOSED');
      expect(res.body.storyCount).toBe(1);
      expect(res.body).toHaveProperty('closedAt');
    });

    it('should return 400 for release with no stories', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      const release = await createRelease(app, user.authHeader, project.id);

      await request(app.getHttpServer())
        .post(`/api/v1/releases/${release.id}/close`)
        .set('Authorization', user.authHeader)
        .expect(400);
    });

    it('should return 409 for already closed release', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      const story = await createStory(app, user.authHeader, project.id);
      const release = await createRelease(app, user.authHeader, project.id);
      await addStoriesToRelease(app, user.authHeader, release.id, [story.id]);
      await closeRelease(app, user.authHeader, release.id);

      await request(app.getHttpServer())
        .post(`/api/v1/releases/${release.id}/close`)
        .set('Authorization', user.authHeader)
        .expect(409);
    });

    it('should produce immutable snapshots', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      const story = await createStory(app, user.authHeader, project.id, {
        title: 'Original Title',
        steps: [{ order: 1, instruction: 'Original Step' }],
      });
      const release = await createRelease(app, user.authHeader, project.id);
      await addStoriesToRelease(app, user.authHeader, release.id, [story.id]);
      await closeRelease(app, user.authHeader, release.id);

      // Modify the source story
      await request(app.getHttpServer())
        .patch(`/api/v1/stories/${story.id}`)
        .set('Authorization', user.authHeader)
        .send({ title: 'Modified Title' })
        .expect(200);

      // Verify snapshot is unchanged
      const res = await request(app.getHttpServer())
        .get(`/api/v1/releases/${release.id}`)
        .set('Authorization', user.authHeader)
        .expect(200);

      expect(res.body.stories[0].title).toBe('Original Title');
    });
  });

  describe('PATCH /api/v1/releases/:id', () => {
    it('should update release name', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      const release = await createRelease(app, user.authHeader, project.id);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/releases/${release.id}`)
        .set('Authorization', user.authHeader)
        .send({ name: 'Updated Release' })
        .expect(200);

      expect(res.body.name).toBe('Updated Release');
    });

    it('should return 409 if release is CLOSED', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      const story = await createStory(app, user.authHeader, project.id);
      const release = await createRelease(app, user.authHeader, project.id);
      await addStoriesToRelease(app, user.authHeader, release.id, [story.id]);
      await closeRelease(app, user.authHeader, release.id);

      await request(app.getHttpServer())
        .patch(`/api/v1/releases/${release.id}`)
        .set('Authorization', user.authHeader)
        .send({ name: 'Cannot Update' })
        .expect(409);
    });
  });

  describe('DELETE /api/v1/releases/:id', () => {
    it('should delete DRAFT release', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      const release = await createRelease(app, user.authHeader, project.id);

      await request(app.getHttpServer())
        .delete(`/api/v1/releases/${release.id}`)
        .set('Authorization', user.authHeader)
        .expect(204);
    });

    it('should return 409 if release is CLOSED', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);
      const story = await createStory(app, user.authHeader, project.id);
      const release = await createRelease(app, user.authHeader, project.id);
      await addStoriesToRelease(app, user.authHeader, release.id, [story.id]);
      await closeRelease(app, user.authHeader, release.id);

      await request(app.getHttpServer())
        .delete(`/api/v1/releases/${release.id}`)
        .set('Authorization', user.authHeader)
        .expect(409);
    });
  });
});

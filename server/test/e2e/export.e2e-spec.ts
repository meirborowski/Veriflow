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

describe('Export (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let admin: TestUser;
  let projectId: string;

  beforeAll(async () => {
    ds = await initTestDataSource();
    await truncateAll();
    app = await createTestApp();
    admin = await registerUser(app);

    // Create a project
    const projRes = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', admin.authHeader)
      .send({ name: 'Export Test Project' })
      .expect(201);

    projectId = (projRes.body as { id: string }).id;
  });

  afterAll(async () => {
    await app.close();
    await closeTestDataSource();
  });

  describe('GET /api/v1/releases/:id/export', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/releases/some-id/export?format=csv')
        .expect(401);
    });

    it('should return 400 for invalid format', async () => {
      // Create and close a release first
      const releaseRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/releases`)
        .set('Authorization', admin.authHeader)
        .send({ name: 'Export Release' })
        .expect(201);

      const releaseId = (releaseRes.body as { id: string }).id;

      await request(app.getHttpServer())
        .get(`/api/v1/releases/${releaseId}/export?format=xml`)
        .set('Authorization', admin.authHeader)
        .expect(400);
    });

    it('should return CSV for a closed release', async () => {
      // Create a story first
      const storyRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/stories`)
        .set('Authorization', admin.authHeader)
        .send({
          title: 'CSV Export Story',
          description: 'Test story for CSV export',
          priority: 'HIGH',
          steps: [{ instruction: 'Step 1' }],
        })
        .expect(201);

      const storyId = (storyRes.body as { id: string }).id;

      // Create release, add story, close
      const releaseRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/releases`)
        .set('Authorization', admin.authHeader)
        .send({ name: 'CSV Release' })
        .expect(201);

      const releaseId = (releaseRes.body as { id: string }).id;

      await request(app.getHttpServer())
        .post(`/api/v1/releases/${releaseId}/stories`)
        .set('Authorization', admin.authHeader)
        .send({ storyIds: [storyId] })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/releases/${releaseId}/close`)
        .set('Authorization', admin.authHeader)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/releases/${releaseId}/export?format=csv`)
        .set('Authorization', admin.authHeader)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.text).toContain('Story Title');
      expect(res.text).toContain('CSV Export Story');
    });

    it('should return PDF for a closed release', async () => {
      // Create story + release + close
      const storyRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/stories`)
        .set('Authorization', admin.authHeader)
        .send({
          title: 'PDF Export Story',
          description: 'Test story for PDF export',
          priority: 'MEDIUM',
          steps: [{ instruction: 'Verify PDF' }],
        })
        .expect(201);

      const storyId = (storyRes.body as { id: string }).id;

      const releaseRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/releases`)
        .set('Authorization', admin.authHeader)
        .send({ name: 'PDF Release' })
        .expect(201);

      const releaseId = (releaseRes.body as { id: string }).id;

      await request(app.getHttpServer())
        .post(`/api/v1/releases/${releaseId}/stories`)
        .set('Authorization', admin.authHeader)
        .send({ storyIds: [storyId] })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/releases/${releaseId}/close`)
        .set('Authorization', admin.authHeader)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/releases/${releaseId}/export?format=pdf`)
        .set('Authorization', admin.authHeader)
        .expect(200)
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        });

      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.body.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('should deny access for non-members', async () => {
      const outsider = await registerUser(app);

      // Create a release
      const releaseRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/releases`)
        .set('Authorization', admin.authHeader)
        .send({ name: 'Access Test Release' })
        .expect(201);

      const releaseId = (releaseRes.body as { id: string }).id;

      await request(app.getHttpServer())
        .get(`/api/v1/releases/${releaseId}/export?format=csv`)
        .set('Authorization', outsider.authHeader)
        .expect(403);
    });
  });

  describe('GET /api/v1/projects/:projectId/bugs/export', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/bugs/export?format=csv`)
        .expect(401);
    });

    it('should return 400 for invalid format', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/bugs/export?format=xml`)
        .set('Authorization', admin.authHeader)
        .expect(400);
    });

    it('should return CSV for bug export', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/bugs/export?format=csv`)
        .set('Authorization', admin.authHeader)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
    });

    it('should return PDF for bug export', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/bugs/export?format=pdf`)
        .set('Authorization', admin.authHeader)
        .expect(200)
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        });

      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.body.subarray(0, 4).toString()).toBe('%PDF');
    });
  });
});

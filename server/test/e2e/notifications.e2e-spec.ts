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

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let user: TestUser;

  beforeAll(async () => {
    ds = await initTestDataSource();
    await truncateAll();
    app = await createTestApp();
    user = await registerUser(app);
  });

  afterAll(async () => {
    await app.close();
    await closeTestDataSource();
  });

  describe('GET /api/v1/notifications', () => {
    it('should return empty list for new user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', user.authHeader)
        .expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .expect(401);
    });
  });

  describe('GET /api/v1/notifications/unread-count', () => {
    it('should return zero for new user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', user.authHeader)
        .expect(200);

      expect(res.body.count).toBe(0);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .expect(401);
    });
  });

  describe('PATCH /api/v1/notifications/:id/read', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/notifications/some-id/read')
        .expect(401);
    });
  });

  describe('POST /api/v1/notifications/read-all', () => {
    it('should succeed even with no unread notifications', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/notifications/read-all')
        .set('Authorization', user.authHeader)
        .expect(204);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/notifications/read-all')
        .expect(401);
    });
  });

  describe('notification triggers', () => {
    it('should create notification when user is added to a project', async () => {
      const admin = await registerUser(app);
      const invitee = await registerUser(app);

      // Create a project
      const projRes = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', admin.authHeader)
        .send({ name: 'Notification Test Project' })
        .expect(201);

      const projectId = (projRes.body as { id: string }).id;

      // Add invitee as member
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', admin.authHeader)
        .send({ email: invitee.email, role: 'TESTER' })
        .expect(201);

      // Check invitee's notifications
      const notifRes = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', invitee.authHeader)
        .expect(200);

      const notifications = (
        notifRes.body as {
          data: {
            type: string;
            relatedEntityType: string;
            relatedEntityId: string;
          }[];
        }
      ).data;
      expect(notifications.length).toBeGreaterThanOrEqual(1);
      expect(notifications[0].type).toBe('MEMBER_ADDED');
      expect(notifications[0].relatedEntityType).toBe('project');
      expect(notifications[0].relatedEntityId).toBe(projectId);

      // Check unread count
      const countRes = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', invitee.authHeader)
        .expect(200);

      expect((countRes.body as { count: number }).count).toBeGreaterThanOrEqual(
        1,
      );

      // Mark as read
      const notifId = notifications[0].id as unknown as string;
      await request(app.getHttpServer())
        .patch(`/api/v1/notifications/${notifId}/read`)
        .set('Authorization', invitee.authHeader)
        .expect(204);

      // Verify unread count decreased
      const countRes2 = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', invitee.authHeader)
        .expect(200);

      expect((countRes2.body as { count: number }).count).toBe(0);
    });

    it('should create notification when marking all as read', async () => {
      const admin = await registerUser(app);
      const invitee = await registerUser(app);

      // Create project and add member to generate a notification
      const projRes = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', admin.authHeader)
        .send({ name: 'Mark All Read Test' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${(projRes.body as { id: string }).id}/members`)
        .set('Authorization', admin.authHeader)
        .send({ email: invitee.email, role: 'DEVELOPER' })
        .expect(201);

      // Mark all as read
      await request(app.getHttpServer())
        .post('/api/v1/notifications/read-all')
        .set('Authorization', invitee.authHeader)
        .expect(204);

      // Verify all read
      const countRes = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', invitee.authHeader)
        .expect(200);

      expect((countRes.body as { count: number }).count).toBe(0);
    });
  });
});

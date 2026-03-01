import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../helpers/app.helper';
import {
  truncateAll,
  initTestDataSource,
  closeTestDataSource,
} from '../helpers/db.helper';
import { registerUser, TestUser } from '../helpers/auth.helper';
import { createProject } from '../helpers/seed.helper';

describe('Projects (e2e)', () => {
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

  describe('POST /api/v1/projects', () => {
    it('should create a project with creator as ADMIN', async () => {
      const user = await registerUser(app);

      const res = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', user.authHeader)
        .send({ name: 'Test Project' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Test Project');

      // Verify creator is ADMIN member
      const detail = await request(app.getHttpServer())
        .get(`/api/v1/projects/${res.body.id}`)
        .set('Authorization', user.authHeader)
        .expect(200);

      const members = detail.body.members;
      expect(members).toHaveLength(1);
      expect(members[0].userId).toBe(user.id);
      expect(members[0].role).toBe('ADMIN');
    });

    it('should return 400 for missing name', async () => {
      const user = await registerUser(app);

      await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', user.authHeader)
        .send({})
        .expect(400);
    });

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/projects')
        .send({ name: 'No Auth' })
        .expect(401);
    });
  });

  describe('GET /api/v1/projects', () => {
    it('should return paginated projects for user', async () => {
      const user = await registerUser(app);
      await createProject(app, user.authHeader, 'Project A');
      await createProject(app, user.authHeader, 'Project B');

      const res = await request(app.getHttpServer())
        .get('/api/v1/projects?page=1&limit=10')
        .set('Authorization', user.authHeader)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('page', 1);
      expect(res.body.meta).toHaveProperty('limit', 10);
    });

    it('should only show projects the user is a member of', async () => {
      const user1 = await registerUser(app);
      const user2 = await registerUser(app);

      await createProject(app, user1.authHeader, 'User1 Only');

      const res = await request(app.getHttpServer())
        .get('/api/v1/projects')
        .set('Authorization', user2.authHeader)
        .expect(200);

      const names = res.body.data.map((p: { name: string }) => p.name);
      expect(names).not.toContain('User1 Only');
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('should return project detail with members', async () => {
      const user = await registerUser(app);
      const project = await createProject(app, user.authHeader);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${project.id}`)
        .set('Authorization', user.authHeader)
        .expect(200);

      expect(res.body.id).toBe(project.id);
      expect(res.body.members).toBeInstanceOf(Array);
      expect(res.body.members.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 403 for non-member', async () => {
      const admin = await registerUser(app);
      const outsider = await registerUser(app);
      const project = await createProject(app, admin.authHeader);

      await request(app.getHttpServer())
        .get(`/api/v1/projects/${project.id}`)
        .set('Authorization', outsider.authHeader)
        .expect(403);
    });

    it('should return 404 for non-existent project', async () => {
      const user = await registerUser(app);

      await request(app.getHttpServer())
        .get('/api/v1/projects/00000000-0000-4000-8000-000000000000')
        .set('Authorization', user.authHeader)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/projects/:id', () => {
    it('should update project as ADMIN', async () => {
      const admin = await registerUser(app);
      const project = await createProject(app, admin.authHeader);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/projects/${project.id}`)
        .set('Authorization', admin.authHeader)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(res.body.name).toBe('Updated Name');
    });

    it('should return 403 for non-admin roles', async () => {
      const admin = await registerUser(app);
      const tester = await registerUser(app);
      const project = await createProject(app, admin.authHeader);

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/members`)
        .set('Authorization', admin.authHeader)
        .send({ email: tester.email, role: 'TESTER' })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/projects/${project.id}`)
        .set('Authorization', tester.authHeader)
        .send({ name: 'Hacked' })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    it('should delete project as ADMIN', async () => {
      const admin = await registerUser(app);
      const project = await createProject(app, admin.authHeader);

      await request(app.getHttpServer())
        .delete(`/api/v1/projects/${project.id}`)
        .set('Authorization', admin.authHeader)
        .expect(204);
    });

    it('should return 403 for non-admin', async () => {
      const admin = await registerUser(app);
      const dev = await registerUser(app);
      const project = await createProject(app, admin.authHeader);

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/members`)
        .set('Authorization', admin.authHeader)
        .send({ email: dev.email, role: 'DEVELOPER' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/api/v1/projects/${project.id}`)
        .set('Authorization', dev.authHeader)
        .expect(403);
    });
  });

  describe('POST /api/v1/projects/:id/members', () => {
    it('should add member to project', async () => {
      const admin = await registerUser(app);
      const newMember = await registerUser(app);
      const project = await createProject(app, admin.authHeader);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/members`)
        .set('Authorization', admin.authHeader)
        .send({ email: newMember.email, role: 'TESTER' })
        .expect(201);

      expect(res.body.userId).toBe(newMember.id);
      expect(res.body.role).toBe('TESTER');
    });

    it('should return 409 for already member', async () => {
      const admin = await registerUser(app);
      const member = await registerUser(app);
      const project = await createProject(app, admin.authHeader);

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/members`)
        .set('Authorization', admin.authHeader)
        .send({ email: member.email, role: 'TESTER' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/members`)
        .set('Authorization', admin.authHeader)
        .send({ email: member.email, role: 'DEVELOPER' })
        .expect(409);
    });

    it('should return 404 for unknown email', async () => {
      const admin = await registerUser(app);
      const project = await createProject(app, admin.authHeader);

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/members`)
        .set('Authorization', admin.authHeader)
        .send({ email: 'nobody@example.com', role: 'TESTER' })
        .expect(404);
    });

    it('should return 403 for non-admin', async () => {
      const admin = await registerUser(app);
      const dev = await registerUser(app);
      const other = await registerUser(app);
      const project = await createProject(app, admin.authHeader);

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/members`)
        .set('Authorization', admin.authHeader)
        .send({ email: dev.email, role: 'DEVELOPER' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/members`)
        .set('Authorization', dev.authHeader)
        .send({ email: other.email, role: 'TESTER' })
        .expect(403);
    });
  });

  describe('PATCH /api/v1/projects/:id/members/:userId', () => {
    let admin: TestUser;
    let member: TestUser;
    let projectId: string;

    beforeEach(async () => {
      admin = await registerUser(app);
      member = await registerUser(app);
      const project = await createProject(app, admin.authHeader);
      projectId = project.id;

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', admin.authHeader)
        .send({ email: member.email, role: 'DEVELOPER' });
    });

    it('should update member role', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/projects/${projectId}/members/${member.id}`)
        .set('Authorization', admin.authHeader)
        .send({ role: 'PM' })
        .expect(200);

      expect(res.body.role).toBe('PM');
    });

    it('should return 400 when demoting last admin', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/projects/${projectId}/members/${admin.id}`)
        .set('Authorization', admin.authHeader)
        .send({ role: 'DEVELOPER' })
        .expect(400);
    });

    it('should return 403 for non-admin', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/projects/${projectId}/members/${admin.id}`)
        .set('Authorization', member.authHeader)
        .send({ role: 'TESTER' })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/projects/:id/members/:userId', () => {
    it('should remove member', async () => {
      const admin = await registerUser(app);
      const member = await registerUser(app);
      const project = await createProject(app, admin.authHeader);

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/members`)
        .set('Authorization', admin.authHeader)
        .send({ email: member.email, role: 'TESTER' });

      await request(app.getHttpServer())
        .delete(`/api/v1/projects/${project.id}/members/${member.id}`)
        .set('Authorization', admin.authHeader)
        .expect(204);
    });

    it('should return 400 when removing last admin', async () => {
      const admin = await registerUser(app);
      const project = await createProject(app, admin.authHeader);

      await request(app.getHttpServer())
        .delete(`/api/v1/projects/${project.id}/members/${admin.id}`)
        .set('Authorization', admin.authHeader)
        .expect(400);
    });

    it('should return 403 for non-admin', async () => {
      const admin = await registerUser(app);
      const dev = await registerUser(app);
      const tester = await registerUser(app);
      const project = await createProject(app, admin.authHeader);

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/members`)
        .set('Authorization', admin.authHeader)
        .send({ email: dev.email, role: 'DEVELOPER' });

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${project.id}/members`)
        .set('Authorization', admin.authHeader)
        .send({ email: tester.email, role: 'TESTER' });

      await request(app.getHttpServer())
        .delete(`/api/v1/projects/${project.id}/members/${tester.id}`)
        .set('Authorization', dev.authHeader)
        .expect(403);
    });
  });
});

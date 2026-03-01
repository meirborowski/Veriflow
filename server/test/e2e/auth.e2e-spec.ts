import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../helpers/app.helper';
import {
  truncateAll,
  initTestDataSource,
  closeTestDataSource,
} from '../helpers/db.helper';
import { registerUser } from '../helpers/auth.helper';

describe('Auth (e2e)', () => {
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

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'register-test@example.com',
          password: 'Password123',
          name: 'Register Test',
        })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
    });

    it('should return 409 for duplicate email', async () => {
      const user = await registerUser(app);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: user.email,
          password: 'Password123',
          name: 'Duplicate',
        })
        .expect(409);

      expect(res.body.message).toContain('already registered');
    });

    it('should return 400 for missing email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ password: 'Password123', name: 'No Email' })
        .expect(400);
    });

    it('should return 400 for invalid email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'not-an-email', password: 'Password123', name: 'Bad' })
        .expect(400);
    });

    it('should return 400 for short password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'short@example.com', password: 'Pass1', name: 'Short' })
        .expect(400);
    });

    it('should return 400 for password without numbers', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'nonumber@example.com',
          password: 'PasswordOnly',
          name: 'No Num',
        })
        .expect(400);
    });

    it('should return 400 for short name', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'shortname@example.com',
          password: 'Password123',
          name: 'A',
        })
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const user = await registerUser(app);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('should return 401 for wrong password', async () => {
      const user = await registerUser(app);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: 'WrongPassword123' })
        .expect(401);
    });

    it('should return 401 for unknown email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'unknown@example.com', password: 'Password123' })
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should return new tokens with valid refresh token', async () => {
      const user = await registerUser(app);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: user.refreshToken })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
    });

    it('should return 401 for invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return user profile', async () => {
      const user = await registerUser(app);

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', user.authHeader)
        .expect(200);

      expect(res.body).toHaveProperty('id', user.id);
      expect(res.body).toHaveProperty('email', user.email);
      expect(res.body).toHaveProperty('name', user.name);
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('refreshTokenHash');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Throttle', () => {
    it('should return 429 after too many rapid requests', async () => {
      // Use a fresh app with real throttle enabled (limit: 10/60s)
      const throttleApp = await createTestApp({ enableThrottle: true });

      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(
          request(throttleApp.getHttpServer())
            .post('/api/v1/auth/login')
            .send({ email: 'throttle@example.com', password: 'Password123' }),
        );
      }

      const results = await Promise.all(promises);
      const statuses = results.map((r) => r.status);

      expect(statuses).toContain(429);

      await throttleApp.close();
    });
  });
});

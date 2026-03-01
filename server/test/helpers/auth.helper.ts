import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'crypto';

export interface TestUser {
  id: string;
  email: string;
  name: string;
  password: string;
  accessToken: string;
  refreshToken: string;
  authHeader: string;
}

export async function registerUser(
  app: INestApplication,
  overrides?: { email?: string; password?: string; name?: string },
): Promise<TestUser> {
  const email = overrides?.email ?? `test-${randomUUID()}@example.com`;
  const password = overrides?.password ?? 'Password123';
  const name = overrides?.name ?? 'Test User';

  const registerRes = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email, password, name })
    .expect(201);

  const { accessToken, refreshToken } = registerRes.body as {
    accessToken: string;
    refreshToken: string;
  };

  const meRes = await request(app.getHttpServer())
    .get('/api/v1/auth/me')
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  const me = meRes.body as { id: string; name: string };

  return {
    id: me.id,
    email,
    name,
    password,
    accessToken,
    refreshToken,
    authHeader: `Bearer ${accessToken}`,
  };
}

export async function loginUser(
  app: INestApplication,
  email: string,
  password: string,
): Promise<TestUser> {
  const loginRes = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);

  const { accessToken, refreshToken } = loginRes.body as {
    accessToken: string;
    refreshToken: string;
  };

  const meRes = await request(app.getHttpServer())
    .get('/api/v1/auth/me')
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  const me = meRes.body as { id: string; name: string };

  return {
    id: me.id,
    email,
    name: me.name,
    password,
    accessToken,
    refreshToken,
    authHeader: `Bearer ${accessToken}`,
  };
}

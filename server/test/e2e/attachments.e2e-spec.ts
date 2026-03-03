import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
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
import { createProject, createStory } from '../helpers/seed.helper';

class NoopThrottlerGuard extends ThrottlerGuard {
  protected override handleRequest(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

/** In-memory StorageService mock — no MinIO required */
class InMemoryStorageService {
  private store = new Map<string, { body: Buffer; contentType: string }>();

  async onModuleInit(): Promise<void> {
    // no-op
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    this.store.set(key, { body, contentType });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getSignedDownloadUrl(key: string): Promise<string> {
    return `http://mock-storage/${key}`;
  }
}

async function createAttachmentTestApp(): Promise<INestApplication> {
  process.env.DATABASE_URL = getTestDatabaseUrl();
  process.env.JWT_SECRET ??= 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET ??= 'test-jwt-refresh-secret';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(ThrottlerGuard)
    .useClass(NoopThrottlerGuard)
    .overrideProvider(StorageService)
    .useClass(InMemoryStorageService)
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

describe('Attachments (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let admin: TestUser;
  let projectId: string;
  let storyId: string;

  beforeAll(async () => {
    ds = await initTestDataSource();
    await truncateAll();
    app = await createAttachmentTestApp();

    admin = await registerUser(app);
    const project = await createProject(app, admin.authHeader);
    projectId = project.id;
    const story = await createStory(app, admin.authHeader, projectId);
    storyId = story.id;
  });

  afterAll(async () => {
    await app.close();
    await closeTestDataSource();
  });

  describe('POST /api/v1/attachments/entity/:entityType/:entityId', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/attachments/entity/story/${storyId}`)
        .attach('file', Buffer.from('test'), 'test.png')
        .expect(401);
    });

    it('should upload a file for a story', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/attachments/entity/story/${storyId}`)
        .set('Authorization', admin.authHeader)
        .attach('file', Buffer.from('test-image-data'), {
          filename: 'screenshot.png',
          contentType: 'image/png',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.originalName).toBe('screenshot.png');
      expect(res.body.mimeType).toBe('image/png');
      expect(res.body.entityType).toBe('story');
      expect(res.body.entityId).toBe(storyId);
    });

    it('should reject disallowed MIME types', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/attachments/entity/story/${storyId}`)
        .set('Authorization', admin.authHeader)
        .attach('file', Buffer.from('zip-data'), {
          filename: 'archive.zip',
          contentType: 'application/zip',
        })
        .expect(400);
    });

    it('should reject files exceeding 10 MB', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024, 'x');

      await request(app.getHttpServer())
        .post(`/api/v1/attachments/entity/story/${storyId}`)
        .set('Authorization', admin.authHeader)
        .attach('file', largeBuffer, {
          filename: 'large.png',
          contentType: 'image/png',
        })
        .expect(400);
    });

    it('should reject invalid entity type', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/attachments/entity/invalid/${storyId}`)
        .set('Authorization', admin.authHeader)
        .attach('file', Buffer.from('test'), {
          filename: 'test.png',
          contentType: 'image/png',
        })
        .expect(403);
    });

    it('should reject non-existent entity', async () => {
      await request(app.getHttpServer())
        .post(
          '/api/v1/attachments/entity/story/00000000-0000-4000-a000-000000000000',
        )
        .set('Authorization', admin.authHeader)
        .attach('file', Buffer.from('test'), {
          filename: 'test.png',
          contentType: 'image/png',
        })
        .expect(404);
    });

    it('should upload a PDF file', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/attachments/entity/story/${storyId}`)
        .set('Authorization', admin.authHeader)
        .attach('file', Buffer.from('%PDF-1.4 test'), {
          filename: 'document.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      expect(res.body.mimeType).toBe('application/pdf');
    });
  });

  describe('GET /api/v1/attachments/entity/:entityType/:entityId', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/attachments/entity/story/${storyId}`)
        .expect(401);
    });

    it('should list attachments for an entity', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/attachments/entity/story/${storyId}`)
        .set('Authorization', admin.authHeader)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body[0]).toHaveProperty('originalName');
      expect(res.body[0]).toHaveProperty('uploadedBy');
    });

    it('should return empty array for entity with no attachments', async () => {
      const story2 = await createStory(app, admin.authHeader, projectId);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/attachments/entity/story/${story2.id}`)
        .set('Authorization', admin.authHeader)
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/v1/attachments/:id/download', () => {
    let attachmentId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/attachments/entity/story/${storyId}`)
        .set('Authorization', admin.authHeader)
        .attach('file', Buffer.from('download-test'), {
          filename: 'download.png',
          contentType: 'image/png',
        })
        .expect(201);

      attachmentId = (res.body as { id: string }).id;
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/attachments/${attachmentId}/download`)
        .expect(401);
    });

    it('should return a signed download URL', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/attachments/${attachmentId}/download`)
        .set('Authorization', admin.authHeader)
        .expect(200);

      expect(res.body).toHaveProperty('url');
      expect(res.body.url).toContain('http://mock-storage/');
    });

    it('should return 404 for non-existent attachment', async () => {
      await request(app.getHttpServer())
        .get(
          '/api/v1/attachments/00000000-0000-4000-a000-000000000000/download',
        )
        .set('Authorization', admin.authHeader)
        .expect(404);
    });
  });

  describe('DELETE /api/v1/attachments/:id', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/attachments/00000000-0000-4000-a000-000000000000')
        .expect(401);
    });

    it('should delete an attachment', async () => {
      const uploadRes = await request(app.getHttpServer())
        .post(`/api/v1/attachments/entity/story/${storyId}`)
        .set('Authorization', admin.authHeader)
        .attach('file', Buffer.from('delete-me'), {
          filename: 'to-delete.png',
          contentType: 'image/png',
        })
        .expect(201);

      const attId = (uploadRes.body as { id: string }).id;

      await request(app.getHttpServer())
        .delete(`/api/v1/attachments/${attId}`)
        .set('Authorization', admin.authHeader)
        .expect(204);

      // Verify it's gone
      await request(app.getHttpServer())
        .get(`/api/v1/attachments/${attId}/download`)
        .set('Authorization', admin.authHeader)
        .expect(404);
    });

    it('should return 404 for non-existent attachment', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/attachments/00000000-0000-4000-a000-000000000000')
        .set('Authorization', admin.authHeader)
        .expect(404);
    });
  });

  describe('Role enforcement', () => {
    it('should deny upload for non-project members', async () => {
      const outsider = await registerUser(app);

      await request(app.getHttpServer())
        .post(`/api/v1/attachments/entity/story/${storyId}`)
        .set('Authorization', outsider.authHeader)
        .attach('file', Buffer.from('test'), {
          filename: 'test.png',
          contentType: 'image/png',
        })
        .expect(403);
    });

    it('should deny list for non-project members', async () => {
      const outsider = await registerUser(app);

      await request(app.getHttpServer())
        .get(`/api/v1/attachments/entity/story/${storyId}`)
        .set('Authorization', outsider.authHeader)
        .expect(403);
    });
  });
});

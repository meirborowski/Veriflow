import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from '../../src/app.module';
import { ValidationPipe } from '../../src/common/pipes/validation.pipe';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { getTestDatabaseUrl } from './db.helper';

class NoopThrottlerGuard extends ThrottlerGuard {
  protected override handleRequest(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

export async function createTestApp(options?: {
  enableThrottle?: boolean;
}): Promise<INestApplication> {
  process.env.DATABASE_URL = getTestDatabaseUrl();
  process.env.JWT_SECRET ??= 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET ??= 'test-jwt-refresh-secret';

  const builder = Test.createTestingModule({
    imports: [AppModule],
  });

  // Disable throttling by default for tests
  if (!options?.enableThrottle) {
    builder.overrideGuard(ThrottlerGuard).useClass(NoopThrottlerGuard);
  }

  const moduleFixture: TestingModule = await builder.compile();

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

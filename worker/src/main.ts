import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { RunnerBootstrapService } from './worker/runner-bootstrap.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  const logger = new Logger('Worker');
  logger.log('Veriflow runner started');

  const bootstrap = app.get(RunnerBootstrapService);
  await bootstrap.run();

  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Worker failed to start', err);
  process.exit(1);
});

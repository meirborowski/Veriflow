import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  const logger = new Logger('Worker');
  logger.log('Veriflow test worker started');
  await app.init();
}

bootstrap().catch((err) => {
  console.error('Worker failed to start', err);
  process.exit(1);
});

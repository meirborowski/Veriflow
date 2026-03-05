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

  const runner = app.get(RunnerBootstrapService);
  await runner.run();

  await app.close();
  process.exit(0);
}

bootstrap().catch(async (err) => {
  console.error('Worker failed to start', err);
  // Best-effort: report ERROR to server so the run does not stay stuck in QUEUED
  const runId = process.env.VERIFLOW_RUN_ID;
  const apiUrl = process.env.VERIFLOW_API_URL;
  const apiKey = process.env.WORKER_API_KEY ?? '';
  if (runId && apiUrl) {
    try {
      await fetch(`${apiUrl}/automation/runs/${runId}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-worker-api-key': apiKey },
        body: JSON.stringify({
          status: 'ERROR',
          completedAt: new Date().toISOString(),
          errorMessage: err instanceof Error ? err.message : String(err),
        }),
      });
    } catch {
      console.error('Failed to report bootstrap failure to API');
    }
  }
  process.exit(1);
});

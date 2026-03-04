import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { WorkerProcessor } from './worker.processor';
import { GitService } from './git.service';
import { RunnerService } from './runner.service';
import { ReporterService } from './reporter.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({ name: 'automation' }),
  ],
  providers: [WorkerProcessor, GitService, RunnerService, ReporterService],
})
export class WorkerModule {}

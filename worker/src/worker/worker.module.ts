import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RunnerBootstrapService } from './runner-bootstrap.service';
import { GitService } from './git.service';
import { RunnerService } from './runner.service';
import { ReporterService } from './reporter.service';

@Module({
  imports: [ConfigModule],
  providers: [RunnerBootstrapService, GitService, RunnerService, ReporterService],
})
export class WorkerModule {}

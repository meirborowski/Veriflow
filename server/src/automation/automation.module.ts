import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';
import { PlaywrightTest } from './entities/playwright-test.entity';
import { StoryTestLink } from './entities/story-test-link.entity';
import { AutomationRun } from './entities/automation-run.entity';
import { ProjectRepoConfig } from './entities/project-repo-config.entity';
import { UserStory } from '../user-stories/entities/user-story.entity';
import { Release } from '../releases/entities/release.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { Bug } from '../bugs/entities/bug.entity';
import { Attachment } from '../attachments/entities/attachment.entity';
import { TestExecution } from '../test-execution/entities/test-execution.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { WorkerAuthGuard } from './guards/worker-auth.guard';
import { RunSpawnerService } from './run-spawner.service';
import { DockerRunSpawnerService } from './spawners/docker-run-spawner.service';
import { K8sRunSpawnerService } from './spawners/k8s-run-spawner.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlaywrightTest,
      StoryTestLink,
      AutomationRun,
      ProjectRepoConfig,
      UserStory,
      Release,
      ProjectMember,
      TestExecution,
      Bug,
      Attachment,
    ]),
    ConfigModule,
  ],
  controllers: [AutomationController],
  providers: [
    AutomationService,
    RolesGuard,
    WorkerAuthGuard,
    DockerRunSpawnerService,
    K8sRunSpawnerService,
    {
      provide: RunSpawnerService,
      useFactory: (
        config: ConfigService,
        docker: DockerRunSpawnerService,
        k8s: K8sRunSpawnerService,
      ): RunSpawnerService => {
        const spawnerType = config.get<string>('SPAWNER_TYPE', 'docker');
        return spawnerType === 'k8s' ? k8s : docker;
      },
      inject: [ConfigService, DockerRunSpawnerService, K8sRunSpawnerService],
    },
  ],
  exports: [AutomationService],
})
export class AutomationModule {}

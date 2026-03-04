import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
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
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'automation',
    }),
  ],
  controllers: [AutomationController],
  providers: [AutomationService, RolesGuard, WorkerAuthGuard],
  exports: [AutomationService],
})
export class AutomationModule {}

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReleasesController } from './releases.controller';
import { ReleasesService } from './releases.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Release } from './entities/release.entity';
import { ReleaseStory } from './entities/release-story.entity';
import { ReleaseStoryStep } from './entities/release-story-step.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { UserStory } from '../user-stories/entities/user-story.entity';
import { TestExecution } from '../test-execution/entities/test-execution.entity';
import { Bug } from '../bugs/entities/bug.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Release,
      ReleaseStory,
      ReleaseStoryStep,
      ProjectMember,
      UserStory,
      TestExecution,
      Bug,
    ]),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [ReleasesController],
  providers: [ReleasesService, RolesGuard],
  exports: [ReleasesService, TypeOrmModule],
})
export class ReleasesModule {}

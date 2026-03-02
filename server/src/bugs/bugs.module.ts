import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BugsController } from './bugs.controller';
import { BugsService } from './bugs.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Bug } from './entities/bug.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { UserStory } from '../user-stories/entities/user-story.entity';
import { TestExecution } from '../test-execution/entities/test-execution.entity';
import { Release } from '../releases/entities/release.entity';
import { ReleaseStory } from '../releases/entities/release-story.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Bug,
      ProjectMember,
      UserStory,
      TestExecution,
      Release,
      ReleaseStory,
    ]),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [BugsController],
  providers: [BugsService, RolesGuard],
  exports: [BugsService, TypeOrmModule],
})
export class BugsModule {}

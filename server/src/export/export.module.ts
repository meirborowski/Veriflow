import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { Release } from '../releases/entities/release.entity';
import { ReleaseStory } from '../releases/entities/release-story.entity';
import { TestExecution } from '../test-execution/entities/test-execution.entity';
import { Bug } from '../bugs/entities/bug.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { UserStory } from '../user-stories/entities/user-story.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { Attachment } from '../attachments/entities/attachment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Release,
      ReleaseStory,
      TestExecution,
      Bug,
      ProjectMember,
      UserStory,
      Attachment,
    ]),
  ],
  controllers: [ExportController],
  providers: [ExportService, RolesGuard],
})
export class ExportModule {}

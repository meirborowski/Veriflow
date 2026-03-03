import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
import { StorageService } from './storage.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Attachment } from './entities/attachment.entity';
import { UserStory } from '../user-stories/entities/user-story.entity';
import { Bug } from '../bugs/entities/bug.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { Release } from '../releases/entities/release.entity';
import { TestExecution } from '../test-execution/entities/test-execution.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Attachment,
      UserStory,
      Bug,
      ProjectMember,
      Release,
      TestExecution,
    ]),
  ],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, StorageService, RolesGuard],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}

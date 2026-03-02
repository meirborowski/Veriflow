import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { Release } from '../releases/entities/release.entity';
import { ReleaseStory } from '../releases/entities/release-story.entity';
import { TestExecution } from '../test-execution/entities/test-execution.entity';
import { StepResult } from '../test-execution/entities/step-result.entity';
import { Bug } from '../bugs/entities/bug.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Release,
      ReleaseStory,
      TestExecution,
      StepResult,
      Bug,
      ProjectMember,
    ]),
  ],
  controllers: [ExportController],
  providers: [ExportService, RolesGuard],
})
export class ExportModule {}

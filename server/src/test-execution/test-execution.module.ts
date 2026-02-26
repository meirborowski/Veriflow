import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { TestExecutionService } from './test-execution.service';
import { TestExecutionGateway } from './test-execution.gateway';
import { TestExecutionController } from './test-execution.controller';
import { TestExecution } from './entities/test-execution.entity';
import { StepResult } from './entities/step-result.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { Release } from '../releases/entities/release.entity';
import { ReleaseStory } from '../releases/entities/release-story.entity';
import { ReleaseStoryStep } from '../releases/entities/release-story-step.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { UserStory } from '../user-stories/entities/user-story.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TestExecution,
      StepResult,
      Release,
      ReleaseStory,
      ReleaseStoryStep,
      ProjectMember,
      UserStory,
    ]),
    JwtModule.register({}),
  ],
  controllers: [TestExecutionController],
  providers: [TestExecutionService, TestExecutionGateway, RolesGuard],
  exports: [TestExecutionService, TypeOrmModule],
})
export class TestExecutionModule {}

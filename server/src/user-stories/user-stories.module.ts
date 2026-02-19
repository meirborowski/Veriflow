import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserStoriesController } from './user-stories.controller';
import { UserStoriesService } from './user-stories.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserStory } from './entities/user-story.entity';
import { VerificationStep } from './entities/verification-step.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { Release } from '../releases/entities/release.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserStory,
      VerificationStep,
      ProjectMember,
      Release,
    ]),
  ],
  controllers: [UserStoriesController],
  providers: [UserStoriesService, RolesGuard],
  exports: [UserStoriesService, TypeOrmModule],
})
export class UserStoriesModule {}

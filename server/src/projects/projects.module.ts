import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { User } from '../auth/entities/user.entity';
import { UserStory } from '../user-stories/entities/user-story.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectMember, User, UserStory]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, RolesGuard],
  exports: [ProjectsService, TypeOrmModule],
})
export class ProjectsModule {}

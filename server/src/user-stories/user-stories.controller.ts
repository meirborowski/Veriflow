import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UserStoriesService } from './user-stories.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { StoryQueryDto } from './dto/story-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ResolveProjectFrom } from '../common/decorators/resolve-project.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/types/enums';

@Controller()
@UseGuards(RolesGuard)
export class UserStoriesController {
  constructor(private readonly userStoriesService: UserStoriesService) {}

  @Post('projects/:projectId/stories')
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER)
  @HttpCode(HttpStatus.CREATED)
  create(@Param('projectId') projectId: string, @Body() dto: CreateStoryDto) {
    return this.userStoriesService.create(projectId, dto);
  }

  @Get('projects/:projectId/stories')
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER, UserRole.TESTER)
  findAll(
    @Param('projectId') projectId: string,
    @Query() query: StoryQueryDto,
  ) {
    return this.userStoriesService.findAllByProject(projectId, query);
  }

  @Get('stories/:id')
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER, UserRole.TESTER)
  @ResolveProjectFrom('story')
  findOne(@Param('id') id: string) {
    return this.userStoriesService.findOne(id);
  }

  @Patch('stories/:id')
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER)
  @ResolveProjectFrom('story')
  update(@Param('id') id: string, @Body() dto: UpdateStoryDto) {
    return this.userStoriesService.update(id, dto);
  }

  @Delete('stories/:id')
  @Roles(UserRole.ADMIN, UserRole.PM)
  @ResolveProjectFrom('story')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.userStoriesService.remove(id);
  }
}

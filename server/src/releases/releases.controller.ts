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
import { ReleasesService } from './releases.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { ReleaseQueryDto } from './dto/release-query.dto';
import { AddStoriesDto } from './dto/add-stories.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ResolveProjectFrom } from '../common/decorators/resolve-project.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/types/enums';

@Controller()
@UseGuards(RolesGuard)
export class ReleasesController {
  constructor(private readonly releasesService: ReleasesService) {}

  @Post('projects/:projectId/releases')
  @Roles(UserRole.ADMIN, UserRole.PM)
  @HttpCode(HttpStatus.CREATED)
  create(@Param('projectId') projectId: string, @Body() dto: CreateReleaseDto) {
    return this.releasesService.create(projectId, dto);
  }

  @Get('projects/:projectId/releases')
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER, UserRole.TESTER)
  findAll(
    @Param('projectId') projectId: string,
    @Query() query: ReleaseQueryDto,
  ) {
    return this.releasesService.findAllByProject(projectId, query);
  }

  @Get('releases/:id')
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER, UserRole.TESTER)
  @ResolveProjectFrom('release')
  findOne(@Param('id') id: string) {
    return this.releasesService.findOne(id);
  }

  @Post('releases/:id/close')
  @Roles(UserRole.ADMIN, UserRole.PM)
  @ResolveProjectFrom('release')
  close(@Param('id') id: string) {
    return this.releasesService.close(id);
  }

  @Post('releases/:id/stories')
  @Roles(UserRole.ADMIN, UserRole.PM)
  @ResolveProjectFrom('release')
  @HttpCode(HttpStatus.CREATED)
  addStories(@Param('id') id: string, @Body() dto: AddStoriesDto) {
    return this.releasesService.addStories(id, dto);
  }

  @Delete('releases/:id/stories/:storyId')
  @Roles(UserRole.ADMIN, UserRole.PM)
  @ResolveProjectFrom('release')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeStory(@Param('id') id: string, @Param('storyId') storyId: string) {
    return this.releasesService.removeStory(id, storyId);
  }

  @Patch('releases/:id')
  @Roles(UserRole.ADMIN, UserRole.PM)
  @ResolveProjectFrom('release')
  update(@Param('id') id: string, @Body() dto: UpdateReleaseDto) {
    return this.releasesService.update(id, dto);
  }

  @Delete('releases/:id')
  @Roles(UserRole.ADMIN, UserRole.PM)
  @ResolveProjectFrom('release')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.releasesService.remove(id);
  }
}

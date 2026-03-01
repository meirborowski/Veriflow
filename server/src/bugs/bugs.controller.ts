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
import { BugsService } from './bugs.service';
import { CreateBugDto } from './dto/create-bug.dto';
import { UpdateBugDto } from './dto/update-bug.dto';
import { BugQueryDto } from './dto/bug-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ResolveProjectFrom } from '../common/decorators/resolve-project.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/types/enums';

@Controller()
@UseGuards(RolesGuard)
export class BugsController {
  constructor(private readonly bugsService: BugsService) {}

  @Post('projects/:projectId/bugs')
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER, UserRole.TESTER)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBugDto,
  ) {
    return this.bugsService.create(projectId, user.userId, dto);
  }

  @Get('projects/:projectId/bugs')
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER, UserRole.TESTER)
  findAll(@Param('projectId') projectId: string, @Query() query: BugQueryDto) {
    return this.bugsService.findAllByProject(projectId, query);
  }

  @Get('bugs/:id')
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER, UserRole.TESTER)
  @ResolveProjectFrom('bug')
  findOne(@Param('id') id: string) {
    return this.bugsService.findOne(id);
  }

  @Patch('bugs/:id')
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER)
  @ResolveProjectFrom('bug')
  update(@Param('id') id: string, @Body() dto: UpdateBugDto) {
    return this.bugsService.update(id, dto);
  }

  @Delete('bugs/:id')
  @Roles(UserRole.ADMIN)
  @ResolveProjectFrom('bug')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.bugsService.remove(id);
  }
}

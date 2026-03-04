import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AutomationService } from './automation.service';
import { SyncRegistryDto } from './dto/sync-registry.dto';
import { LinkTestsDto } from './dto/link-tests.dto';
import { ReportRunDto } from './dto/report-run.dto';
import { TriggerRunDto } from './dto/trigger-run.dto';
import { UpsertRepoConfigDto } from './dto/upsert-repo-config.dto';
import { AutomationQueryDto } from './dto/automation-query.dto';
import { UpdateRunStatusDto } from './dto/update-run-status.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ResolveProjectFrom } from '../common/decorators/resolve-project.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { WorkerAuthGuard } from './guards/worker-auth.guard';
import { UserRole } from '../common/types/enums';

@Controller()
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  // ── Registry ────────────────────────────────────────────────────────

  @Post('projects/:projectId/automation/registry/sync')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER)
  async registrySync(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Body() dto: SyncRegistryDto,
  ) {
    return this.automationService.registrySync(projectId, dto);
  }

  @Get('projects/:projectId/automation/tests')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER, UserRole.TESTER)
  async listTests(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Query() query: AutomationQueryDto,
  ) {
    return this.automationService.listTests(projectId, query);
  }

  @Get('automation/tests/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER, UserRole.TESTER)
  @ResolveProjectFrom('automation-test')
  async getTest(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.automationService.getTest(id);
  }

  @Delete('automation/tests/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PM)
  @ResolveProjectFrom('automation-test')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTest(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    await this.automationService.deleteTest(id);
  }

  // ── Story-Test Links ─────────────────────────────────────────────────

  @Post('stories/:storyId/automation/link')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER)
  @ResolveProjectFrom('story')
  async linkTests(
    @Param('storyId', new ParseUUIDPipe({ version: '4' })) storyId: string,
    @Body() dto: LinkTestsDto,
  ) {
    return this.automationService.linkTests(storyId, dto);
  }

  @Delete('stories/:storyId/automation/link/:testId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER)
  @ResolveProjectFrom('story')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlinkTest(
    @Param('storyId', new ParseUUIDPipe({ version: '4' })) storyId: string,
    @Param('testId', new ParseUUIDPipe({ version: '4' })) testId: string,
  ) {
    await this.automationService.unlinkTest(storyId, testId);
  }

  @Get('stories/:storyId/automation/summary')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER, UserRole.TESTER)
  @ResolveProjectFrom('story')
  async getAutomationSummary(
    @Param('storyId', new ParseUUIDPipe({ version: '4' })) storyId: string,
  ) {
    return this.automationService.getAutomationSummary(storyId);
  }

  // ── Trigger + Runs ───────────────────────────────────────────────────

  @Post('projects/:projectId/automation/trigger')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER)
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerRun(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Body() dto: TriggerRunDto,
  ) {
    return this.automationService.triggerRun(projectId, dto);
  }

  @Post('projects/:projectId/automation/runs')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER)
  async reportRun(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Body() dto: ReportRunDto,
  ) {
    return this.automationService.reportRun(projectId, dto);
  }

  @Get('projects/:projectId/automation/runs')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER, UserRole.TESTER)
  async listRuns(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Query() query: AutomationQueryDto,
  ) {
    return this.automationService.listRuns(projectId, query);
  }

  @Get('automation/runs/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER, UserRole.TESTER)
  @ResolveProjectFrom('automation-run')
  async getRun(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.automationService.getRun(id);
  }

  @Get('automation/runs/:id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER, UserRole.TESTER)
  @ResolveProjectFrom('automation-run')
  async getRunStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.automationService.getRunStatus(id);
  }

  @Patch('automation/runs/:id/status')
  @Public()
  @UseGuards(WorkerAuthGuard)
  async updateRunStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateRunStatusDto,
  ) {
    return this.automationService.updateRunStatus(id, dto);
  }

  // ── Repo Config ───────────────────────────────────────────────────────

  @Get('projects/:projectId/automation/config')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PM)
  async getRepoConfig(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
  ) {
    return this.automationService.getRepoConfig(projectId);
  }

  @Put('projects/:projectId/automation/config')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PM)
  async upsertRepoConfig(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Body() dto: UpsertRepoConfigDto,
  ) {
    return this.automationService.upsertRepoConfig(projectId, dto);
  }
}

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { TestExecutionService } from './test-execution.service';
import { ExecutionQueryDto } from './dto/execution-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ResolveProjectFrom } from '../common/decorators/resolve-project.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/types/enums';

@Controller()
@UseGuards(RolesGuard)
export class TestExecutionController {
  constructor(private readonly executionService: TestExecutionService) {}

  @Get('releases/:id/executions')
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER, UserRole.TESTER)
  @ResolveProjectFrom('release')
  findAllByRelease(
    @Param('id') releaseId: string,
    @Query() query: ExecutionQueryDto,
  ) {
    return this.executionService.findAllByRelease(releaseId, query);
  }

  @Get('releases/:id/executions/latest')
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER, UserRole.TESTER)
  @ResolveProjectFrom('release')
  findLatestByRelease(@Param('id') releaseId: string) {
    return this.executionService.findLatestByRelease(releaseId);
  }

  @Get('executions/:id')
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER, UserRole.TESTER)
  @ResolveProjectFrom('execution')
  findOne(@Param('id') id: string) {
    return this.executionService.findOne(id);
  }
}

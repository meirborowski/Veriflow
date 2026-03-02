import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ExportService } from './export.service';
import { Roles } from '../common/decorators/roles.decorator';
import { ResolveProjectFrom } from '../common/decorators/resolve-project.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/types/enums';
import { BugQueryDto } from '../bugs/dto/bug-query.dto';

@Controller()
@UseGuards(RolesGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('releases/:id/export')
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER, UserRole.TESTER)
  @ResolveProjectFrom('release')
  async exportRelease(
    @Param('id') id: string,
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    if (format === 'csv') {
      const stream = await this.exportService.generateReleaseReportCsv(id);
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="release-report-${id}.csv"`,
      });
      stream.pipe(res);
    } else if (format === 'pdf') {
      const stream = await this.exportService.generateReleaseReportPdf(id);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="release-report-${id}.pdf"`,
      });
      stream.pipe(res);
    } else {
      throw new BadRequestException('Invalid format. Use "csv" or "pdf".');
    }
  }

  @Get('projects/:projectId/bugs/export')
  @Roles(UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER, UserRole.TESTER)
  async exportBugs(
    @Param('projectId') projectId: string,
    @Query('format') format: string,
    @Query() query: BugQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    if (format === 'csv') {
      const stream = await this.exportService.generateBugExportCsv(
        projectId,
        query,
      );
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="bugs-export-${projectId}.csv"`,
      });
      stream.pipe(res);
    } else if (format === 'pdf') {
      const stream = await this.exportService.generateBugExportPdf(
        projectId,
        query,
      );
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="bugs-export-${projectId}.pdf"`,
      });
      stream.pipe(res);
    } else {
      throw new BadRequestException('Invalid format. Use "csv" or "pdf".');
    }
  }
}

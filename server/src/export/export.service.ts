import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Readable } from 'stream';
import { format } from 'fast-csv';
import PDFDocument from 'pdfkit';
import { Release } from '../releases/entities/release.entity';
import { ReleaseStory } from '../releases/entities/release-story.entity';
import { TestExecution } from '../test-execution/entities/test-execution.entity';
import type { StepResult } from '../test-execution/entities/step-result.entity';
import { Bug } from '../bugs/entities/bug.entity';
import { ReleaseStatus } from '../common/types/enums';
import type { BugExportQueryDto } from './dto/bug-export-query.dto';

interface ReleaseReportRow {
  storyTitle: string;
  priority: string;
  testStatus: string;
  tester: string;
  attempt: number;
  stepInstruction: string;
  stepResult: string;
  stepComment: string;
}

interface BugExportRow {
  title: string;
  severity: string;
  status: string;
  storyTitle: string;
  reportedBy: string;
  assignedTo: string;
  createdAt: string;
  description: string;
}

function sanitizeCsvValue(value: string | number): string | number {
  if (typeof value !== 'string') return value;
  if (/^[=+\-@\t\r]/.test(value)) return `'${value}`;
  return value;
}

function sanitizeCsvRow(
  row: Record<string, string | number>,
): Record<string, string | number> {
  const sanitized: Record<string, string | number> = {};
  for (const [key, val] of Object.entries(row)) {
    sanitized[key] = sanitizeCsvValue(val);
  }
  return sanitized;
}

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Release)
    private readonly releaseRepository: Repository<Release>,
    @InjectRepository(ReleaseStory)
    private readonly releaseStoryRepository: Repository<ReleaseStory>,
    @InjectRepository(TestExecution)
    private readonly executionRepository: Repository<TestExecution>,
    @InjectRepository(Bug)
    private readonly bugRepository: Repository<Bug>,
  ) {}

  async generateReleaseReportCsv(releaseId: string): Promise<Readable> {
    const rows = await this.getReleaseReportData(releaseId);

    const csvStream = format({ headers: true });
    const readable = new Readable({ read() {} });

    csvStream.on('data', (chunk: Buffer) => readable.push(chunk));
    csvStream.on('end', () => readable.push(null));
    csvStream.on('error', (err: Error) => readable.destroy(err));

    for (const row of rows) {
      csvStream.write(
        sanitizeCsvRow({
          'Story Title': row.storyTitle,
          Priority: row.priority,
          'Test Status': row.testStatus,
          Tester: row.tester,
          Attempt: row.attempt,
          'Step Instruction': row.stepInstruction,
          'Step Result': row.stepResult,
          'Step Comment': row.stepComment,
        }),
      );
    }

    csvStream.end();
    return readable;
  }

  async generateReleaseReportPdf(releaseId: string): Promise<Readable> {
    const release = await this.releaseRepository.findOne({
      where: { id: releaseId },
      select: ['id', 'name', 'status', 'closedAt'],
    });

    if (!release) {
      throw new NotFoundException('Release not found');
    }

    const rows = await this.getReleaseReportData(releaseId);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const readable = new Readable({ read() {} });

    doc.on('data', (chunk: Buffer) => readable.push(chunk));
    doc.on('end', () => readable.push(null));

    // Header
    doc
      .fontSize(18)
      .text(`Release Report: ${release.name}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666666');
    doc.text(`Status: ${release.status}`, { continued: true });
    if (release.closedAt) {
      doc.text(`  |  Closed: ${release.closedAt.toISOString().split('T')[0]}`);
    } else {
      doc.text('');
    }
    doc.text(`Generated: ${new Date().toISOString().split('T')[0]}`);
    doc.moveDown();

    doc.fillColor('#000000');

    // Group rows by story
    const storiesMap = new Map<
      string,
      {
        priority: string;
        testStatus: string;
        tester: string;
        attempt: number;
        steps: ReleaseReportRow[];
      }
    >();
    for (const row of rows) {
      if (!storiesMap.has(row.storyTitle)) {
        storiesMap.set(row.storyTitle, {
          priority: row.priority,
          testStatus: row.testStatus,
          tester: row.tester,
          attempt: row.attempt,
          steps: [],
        });
      }
      storiesMap.get(row.storyTitle)!.steps.push(row);
    }

    let storyIndex = 0;
    for (const [storyTitle, storyData] of storiesMap) {
      if (storyIndex > 0) {
        doc.moveDown(0.5);
      }

      // Story header
      doc.fontSize(12).font('Helvetica-Bold').text(storyTitle);
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#666666')
        .text(
          `Priority: ${storyData.priority}  |  Status: ${storyData.testStatus}  |  Tester: ${storyData.tester}  |  Attempt: ${storyData.attempt}`,
        );
      doc.fillColor('#000000');
      doc.moveDown(0.3);

      // Steps table
      for (const step of storyData.steps) {
        if (step.stepInstruction) {
          doc
            .fontSize(9)
            .font('Helvetica')
            .text(`  ${step.stepResult.padEnd(8)} ${step.stepInstruction}`, {
              indent: 10,
            });
          if (step.stepComment) {
            doc
              .fontSize(8)
              .fillColor('#888888')
              .text(`           ${step.stepComment}`, { indent: 10 });
            doc.fillColor('#000000');
          }
        }
      }

      storyIndex++;
    }

    if (rows.length === 0) {
      doc
        .fontSize(11)
        .text('No test execution data available for this release.');
    }

    doc.end();
    return readable;
  }

  async generateBugExportCsv(
    projectId: string,
    filters?: BugExportQueryDto,
  ): Promise<Readable> {
    const rows = await this.getBugExportData(projectId, filters);

    const csvStream = format({ headers: true });
    const readable = new Readable({ read() {} });

    csvStream.on('data', (chunk: Buffer) => readable.push(chunk));
    csvStream.on('end', () => readable.push(null));
    csvStream.on('error', (err: Error) => readable.destroy(err));

    for (const row of rows) {
      csvStream.write(
        sanitizeCsvRow({
          Title: row.title,
          Severity: row.severity,
          Status: row.status,
          'Story Title': row.storyTitle,
          'Reported By': row.reportedBy,
          'Assigned To': row.assignedTo,
          'Created At': row.createdAt,
          Description: row.description,
        }),
      );
    }

    csvStream.end();
    return readable;
  }

  async generateBugExportPdf(
    projectId: string,
    filters?: BugExportQueryDto,
  ): Promise<Readable> {
    const rows = await this.getBugExportData(projectId, filters);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const readable = new Readable({ read() {} });

    doc.on('data', (chunk: Buffer) => readable.push(chunk));
    doc.on('end', () => readable.push(null));

    // Header
    doc.fontSize(18).text('Bug Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666666');
    doc.text(
      `Total bugs: ${rows.length}  |  Generated: ${new Date().toISOString().split('T')[0]}`,
    );
    doc.moveDown();

    doc.fillColor('#000000');

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (i > 0) {
        doc.moveDown(0.3);
        doc
          .moveTo(40, doc.y)
          .lineTo(555, doc.y)
          .strokeColor('#dddddd')
          .stroke();
        doc.moveDown(0.3);
      }

      doc.fontSize(11).font('Helvetica-Bold').text(row.title);
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#666666')
        .text(
          `Severity: ${row.severity}  |  Status: ${row.status}  |  Story: ${row.storyTitle}`,
        );
      doc.text(
        `Reported by: ${row.reportedBy}  |  Assigned to: ${row.assignedTo}  |  Created: ${row.createdAt}`,
      );
      doc.fillColor('#000000');

      if (row.description) {
        doc.moveDown(0.2);
        doc.fontSize(9).text(row.description, { indent: 10 });
      }
    }

    if (rows.length === 0) {
      doc.fontSize(11).text('No bugs found matching the specified filters.');
    }

    doc.end();
    return readable;
  }

  private async getReleaseReportData(
    releaseId: string,
  ): Promise<ReleaseReportRow[]> {
    const release = await this.releaseRepository.findOne({
      where: { id: releaseId },
      select: ['id', 'status'],
    });

    if (!release) {
      throw new NotFoundException('Release not found');
    }

    if (release.status !== ReleaseStatus.CLOSED) {
      throw new NotFoundException(
        'Release must be closed to generate a report',
      );
    }

    // Get all stories with steps for this release
    const stories = await this.releaseStoryRepository.find({
      where: { releaseId },
      relations: ['steps'],
      order: { title: 'ASC' },
    });

    // Get the latest completed execution per story
    const latestExecutions = await this.executionRepository
      .createQueryBuilder('exec')
      .innerJoinAndSelect('exec.assignedToUser', 'tester')
      .leftJoinAndSelect('exec.stepResults', 'sr')
      .where('exec.releaseId = :releaseId', { releaseId })
      .andWhere('exec.completedAt IS NOT NULL')
      .andWhere(
        `exec.attempt = (
          SELECT MAX(e2.attempt) FROM test_executions e2
          WHERE e2."releaseStoryId" = exec."releaseStoryId"
          AND e2."completedAt" IS NOT NULL
        )`,
      )
      .getMany();

    const executionMap = new Map<string, TestExecution>();
    for (const exec of latestExecutions) {
      executionMap.set(exec.releaseStoryId, exec);
    }

    const rows: ReleaseReportRow[] = [];

    for (const story of stories) {
      const exec = executionMap.get(story.id);
      const tester = exec?.assignedToUser?.name ?? 'N/A';
      const testStatus = exec?.status ?? 'UNTESTED';
      const attempt = exec?.attempt ?? 0;

      const sortedSteps = (story.steps ?? []).sort((a, b) => a.order - b.order);

      if (sortedSteps.length === 0) {
        rows.push({
          storyTitle: story.title,
          priority: story.priority,
          testStatus,
          tester,
          attempt,
          stepInstruction: '',
          stepResult: '',
          stepComment: '',
        });
      } else {
        const stepResultMap = new Map<string, StepResult>();
        if (exec?.stepResults) {
          for (const sr of exec.stepResults) {
            stepResultMap.set(sr.releaseStoryStepId, sr);
          }
        }

        for (const step of sortedSteps) {
          const sr = stepResultMap.get(step.id);
          rows.push({
            storyTitle: story.title,
            priority: story.priority,
            testStatus,
            tester,
            attempt,
            stepInstruction: step.instruction,
            stepResult: sr?.status ?? 'N/A',
            stepComment: sr?.comment ?? '',
          });
        }
      }
    }

    return rows;
  }

  private async getBugExportData(
    projectId: string,
    filters?: BugExportQueryDto,
  ): Promise<BugExportRow[]> {
    const qb = this.bugRepository
      .createQueryBuilder('bug')
      .innerJoinAndSelect('bug.story', 'story')
      .innerJoinAndSelect('bug.reportedBy', 'reporter')
      .leftJoinAndSelect('bug.assignedTo', 'assignee')
      .where('bug.projectId = :projectId', { projectId })
      .orderBy('bug.createdAt', 'DESC');

    if (filters?.status) {
      qb.andWhere('bug.status = :status', { status: filters.status });
    }
    if (filters?.severity) {
      qb.andWhere('bug.severity = :severity', { severity: filters.severity });
    }
    if (filters?.search) {
      qb.andWhere(
        '(bug.title ILIKE :search OR bug.description ILIKE :search)',
        {
          search: `%${filters.search}%`,
        },
      );
    }

    const bugs = await qb.getMany();

    return bugs.map((bug) => ({
      title: bug.title,
      severity: bug.severity,
      status: bug.status,
      storyTitle: bug.story?.title ?? 'N/A',
      reportedBy: bug.reportedBy?.name ?? 'N/A',
      assignedTo: bug.assignedTo?.name ?? 'Unassigned',
      createdAt: bug.createdAt.toISOString().split('T')[0],
      description: bug.description,
    }));
  }
}

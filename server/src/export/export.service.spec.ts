import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ExportService } from './export.service';
import { Release } from '../releases/entities/release.entity';
import { ReleaseStory } from '../releases/entities/release-story.entity';
import { TestExecution } from '../test-execution/entities/test-execution.entity';
import { StepResult } from '../test-execution/entities/step-result.entity';
import { Bug } from '../bugs/entities/bug.entity';
import {
  ReleaseStatus,
  Priority,
  TestStatus,
  StepStatus,
  BugSeverity,
  BugStatus,
} from '../common/types/enums';

describe('ExportService', () => {
  let service: ExportService;

  const mockReleaseRepo = {
    findOne: jest.fn(),
  };

  const mockReleaseStoryRepo = {
    find: jest.fn(),
  };

  const mockExecutionQb = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockExecutionRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockExecutionQb),
  };

  const mockStepResultRepo = {};

  const mockBugQb = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockBugRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockBugQb),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        { provide: getRepositoryToken(Release), useValue: mockReleaseRepo },
        {
          provide: getRepositoryToken(ReleaseStory),
          useValue: mockReleaseStoryRepo,
        },
        {
          provide: getRepositoryToken(TestExecution),
          useValue: mockExecutionRepo,
        },
        {
          provide: getRepositoryToken(StepResult),
          useValue: mockStepResultRepo,
        },
        { provide: getRepositoryToken(Bug), useValue: mockBugRepo },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
    jest.clearAllMocks();

    mockExecutionRepo.createQueryBuilder.mockReturnValue(mockExecutionQb);
    mockBugRepo.createQueryBuilder.mockReturnValue(mockBugQb);
  });

  async function streamToString(
    stream: NodeJS.ReadableStream,
  ): Promise<string> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      stream.on('error', reject);
    });
  }

  describe('generateReleaseReportCsv', () => {
    it('should generate CSV for a closed release with stories and steps', async () => {
      mockReleaseRepo.findOne.mockResolvedValue({
        id: 'rel-1',
        status: ReleaseStatus.CLOSED,
      });

      mockReleaseStoryRepo.find.mockResolvedValue([
        {
          id: 'rs-1',
          title: 'Login Story',
          priority: Priority.HIGH,
          steps: [
            { id: 'step-1', order: 1, instruction: 'Open login page' },
            { id: 'step-2', order: 2, instruction: 'Enter credentials' },
          ],
        },
      ]);

      mockExecutionQb.getMany.mockResolvedValue([
        {
          id: 'exec-1',
          releaseStoryId: 'rs-1',
          status: TestStatus.PASS,
          attempt: 1,
          assignedToUser: { name: 'John Doe' },
          stepResults: [
            {
              releaseStoryStepId: 'step-1',
              status: StepStatus.PASS,
              comment: null,
            },
            {
              releaseStoryStepId: 'step-2',
              status: StepStatus.PASS,
              comment: 'Worked fine',
            },
          ],
        },
      ]);

      const stream = await service.generateReleaseReportCsv('rel-1');
      const csv = await streamToString(stream);

      expect(csv).toContain('Story Title');
      expect(csv).toContain('Login Story');
      expect(csv).toContain('Open login page');
      expect(csv).toContain('Enter credentials');
      expect(csv).toContain('PASS');
      expect(csv).toContain('John Doe');
    });

    it('should throw NotFoundException for non-existent release', async () => {
      mockReleaseRepo.findOne.mockResolvedValue(null);

      await expect(service.generateReleaseReportCsv('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for draft release', async () => {
      mockReleaseRepo.findOne.mockResolvedValue({
        id: 'rel-1',
        status: ReleaseStatus.DRAFT,
      });

      await expect(service.generateReleaseReportCsv('rel-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle stories without executions', async () => {
      mockReleaseRepo.findOne.mockResolvedValue({
        id: 'rel-1',
        status: ReleaseStatus.CLOSED,
      });

      mockReleaseStoryRepo.find.mockResolvedValue([
        {
          id: 'rs-1',
          title: 'Untested Story',
          priority: Priority.LOW,
          steps: [{ id: 'step-1', order: 1, instruction: 'Do something' }],
        },
      ]);

      mockExecutionQb.getMany.mockResolvedValue([]);

      const stream = await service.generateReleaseReportCsv('rel-1');
      const csv = await streamToString(stream);

      expect(csv).toContain('Untested Story');
      expect(csv).toContain('UNTESTED');
      expect(csv).toContain('N/A');
    });
  });

  describe('generateReleaseReportPdf', () => {
    it('should generate PDF for a closed release', async () => {
      mockReleaseRepo.findOne
        .mockResolvedValueOnce({
          id: 'rel-1',
          name: 'v1.0',
          status: ReleaseStatus.CLOSED,
          closedAt: new Date('2026-01-01'),
        })
        .mockResolvedValueOnce({
          id: 'rel-1',
          status: ReleaseStatus.CLOSED,
        });

      mockReleaseStoryRepo.find.mockResolvedValue([]);
      mockExecutionQb.getMany.mockResolvedValue([]);

      const stream = await service.generateReleaseReportPdf('rel-1');
      const buffer = await streamToBuffer(stream);

      // PDF starts with %PDF
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('should throw NotFoundException for non-existent release', async () => {
      mockReleaseRepo.findOne.mockResolvedValue(null);

      await expect(service.generateReleaseReportPdf('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('generateBugExportCsv', () => {
    it('should generate CSV with bug data', async () => {
      mockBugQb.getMany.mockResolvedValue([
        {
          title: 'Login bug',
          severity: BugSeverity.CRITICAL,
          status: BugStatus.OPEN,
          description: 'Cannot login',
          createdAt: new Date('2026-02-01'),
          story: { title: 'Login Story' },
          reportedBy: { name: 'John' },
          assignedTo: { name: 'Jane' },
        },
      ]);

      const stream = await service.generateBugExportCsv('project-1', {
        page: 1,
        limit: 20,
      });
      const csv = await streamToString(stream);

      expect(csv).toContain('Login bug');
      expect(csv).toContain('CRITICAL');
      expect(csv).toContain('OPEN');
      expect(csv).toContain('John');
      expect(csv).toContain('Jane');
    });

    it('should apply filters', async () => {
      mockBugQb.getMany.mockResolvedValue([]);

      await service.generateBugExportCsv('project-1', {
        page: 1,
        limit: 20,
        status: BugStatus.OPEN,
        severity: BugSeverity.MAJOR,
        search: 'login',
      });

      expect(mockBugQb.andWhere).toHaveBeenCalledWith('bug.status = :status', {
        status: BugStatus.OPEN,
      });
      expect(mockBugQb.andWhere).toHaveBeenCalledWith(
        'bug.severity = :severity',
        { severity: BugSeverity.MAJOR },
      );
      expect(mockBugQb.andWhere).toHaveBeenCalledWith(
        '(bug.title ILIKE :search OR bug.description ILIKE :search)',
        { search: '%login%' },
      );
    });

    it('should handle unassigned bugs', async () => {
      mockBugQb.getMany.mockResolvedValue([
        {
          title: 'Unassigned bug',
          severity: BugSeverity.MINOR,
          status: BugStatus.OPEN,
          description: 'A bug',
          createdAt: new Date('2026-02-01'),
          story: { title: 'Some Story' },
          reportedBy: { name: 'John' },
          assignedTo: null,
        },
      ]);

      const stream = await service.generateBugExportCsv('project-1', {
        page: 1,
        limit: 20,
      });
      const csv = await streamToString(stream);

      expect(csv).toContain('Unassigned');
    });
  });

  describe('generateBugExportPdf', () => {
    it('should generate valid PDF', async () => {
      mockBugQb.getMany.mockResolvedValue([
        {
          title: 'Test bug',
          severity: BugSeverity.MAJOR,
          status: BugStatus.IN_PROGRESS,
          description: 'Bug description',
          createdAt: new Date('2026-02-01'),
          story: { title: 'Story' },
          reportedBy: { name: 'John' },
          assignedTo: null,
        },
      ]);

      const stream = await service.generateBugExportPdf('project-1', {
        page: 1,
        limit: 20,
      });
      const buffer = await streamToBuffer(stream);

      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('should handle empty bug list', async () => {
      mockBugQb.getMany.mockResolvedValue([]);

      const stream = await service.generateBugExportPdf('project-1', {
        page: 1,
        limit: 20,
      });
      const buffer = await streamToBuffer(stream);

      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });
  });
});

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

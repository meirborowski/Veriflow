import { Test, TestingModule } from '@nestjs/testing';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { BadRequestException } from '@nestjs/common';
import { Readable } from 'stream';

describe('ExportController', () => {
  let controller: ExportController;

  const mockService = {
    generateReleaseReportCsv: jest.fn(),
    generateReleaseReportPdf: jest.fn(),
    generateBugExportCsv: jest.fn(),
    generateBugExportPdf: jest.fn(),
  };

  const createMockResponse = () => ({
    set: jest.fn(),
    pipe: jest.fn(),
  });

  const createMockStream = () => {
    const stream = new Readable({ read() {} });
    stream.pipe = jest.fn().mockReturnValue(stream);
    return stream;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExportController],
      providers: [{ provide: ExportService, useValue: mockService }],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ExportController>(ExportController);
    jest.clearAllMocks();
  });

  describe('exportRelease', () => {
    it('should export release as CSV', async () => {
      const mockStream = createMockStream();
      mockService.generateReleaseReportCsv.mockResolvedValue(mockStream);
      const res = createMockResponse();

      await controller.exportRelease('rel-1', 'csv', res as never);

      expect(mockService.generateReleaseReportCsv).toHaveBeenCalledWith(
        'rel-1',
      );
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({ 'Content-Type': 'text/csv' }),
      );
    });

    it('should export release as PDF', async () => {
      const mockStream = createMockStream();
      mockService.generateReleaseReportPdf.mockResolvedValue(mockStream);
      const res = createMockResponse();

      await controller.exportRelease('rel-1', 'pdf', res as never);

      expect(mockService.generateReleaseReportPdf).toHaveBeenCalledWith(
        'rel-1',
      );
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({ 'Content-Type': 'application/pdf' }),
      );
    });

    it('should throw BadRequestException for invalid format', async () => {
      const res = createMockResponse();

      await expect(
        controller.exportRelease('rel-1', 'xml', res as never),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('exportBugs', () => {
    it('should export bugs as CSV', async () => {
      const mockStream = createMockStream();
      mockService.generateBugExportCsv.mockResolvedValue(mockStream);
      const res = createMockResponse();
      const query = { page: 1, limit: 20 };

      await controller.exportBugs(
        'proj-1',
        'csv',
        query as never,
        res as never,
      );

      expect(mockService.generateBugExportCsv).toHaveBeenCalledWith(
        'proj-1',
        query,
      );
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({ 'Content-Type': 'text/csv' }),
      );
    });

    it('should export bugs as PDF', async () => {
      const mockStream = createMockStream();
      mockService.generateBugExportPdf.mockResolvedValue(mockStream);
      const res = createMockResponse();
      const query = { page: 1, limit: 20 };

      await controller.exportBugs(
        'proj-1',
        'pdf',
        query as never,
        res as never,
      );

      expect(mockService.generateBugExportPdf).toHaveBeenCalledWith(
        'proj-1',
        query,
      );
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({ 'Content-Type': 'application/pdf' }),
      );
    });

    it('should throw BadRequestException for invalid format', async () => {
      const res = createMockResponse();

      await expect(
        controller.exportBugs('proj-1', 'txt', {} as never, res as never),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

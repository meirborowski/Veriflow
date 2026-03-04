import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ReporterService } from './reporter.service';
import axios from 'axios';

jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('ReporterService', () => {
  let service: ReporterService;

  const mockConfig = {
    get: jest.fn((key: string, defaultVal?: unknown) => {
      const map: Record<string, unknown> = {
        VERIFLOW_API_URL: 'http://server:3001/api/v1',
        WORKER_API_KEY: 'test-key',
      };
      return map[key] ?? defaultVal;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReporterService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<ReporterService>(ReporterService);
    jest.clearAllMocks();
  });

  describe('updateStatus', () => {
    it('should PATCH the run status endpoint', async () => {
      mockAxios.patch = jest.fn().mockResolvedValue({ data: {} });

      await service.updateStatus('run-1', 'CLONING');

      expect(mockAxios.patch).toHaveBeenCalledWith(
        'http://server:3001/api/v1/automation/runs/run-1/status',
        { status: 'CLONING' },
        { headers: { 'x-worker-api-key': 'test-key' } },
      );
    });

    it('should not throw if axios PATCH fails', async () => {
      mockAxios.patch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(service.updateStatus('run-1', 'CLONING')).resolves.toBeUndefined();
    });
  });

  describe('reportResult', () => {
    it('should PATCH with full result payload', async () => {
      mockAxios.patch = jest.fn().mockResolvedValue({ data: {} });

      const payload = {
        status: 'PASS',
        duration: 1500,
        completedAt: '2026-03-03T00:00:00.000Z',
        logs: 'all good',
      };

      await service.reportResult('run-1', payload);

      expect(mockAxios.patch).toHaveBeenCalledWith(
        'http://server:3001/api/v1/automation/runs/run-1/status',
        payload,
        { headers: { 'x-worker-api-key': 'test-key' } },
      );
    });

    it('should not throw if reporting fails', async () => {
      mockAxios.patch = jest.fn().mockRejectedValue(new Error('Server down'));

      await expect(
        service.reportResult('run-1', { status: 'FAIL' }),
      ).resolves.toBeUndefined();
    });
  });
});

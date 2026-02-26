import { Test, TestingModule } from '@nestjs/testing';
import { TestExecutionController } from './test-execution.controller';
import { TestExecutionService } from './test-execution.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { TestStatus, Priority } from '../common/types/enums';

describe('TestExecutionController', () => {
  let controller: TestExecutionController;

  const mockService = {
    findAllByRelease: jest.fn(),
    findLatestByRelease: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestExecutionController],
      providers: [{ provide: TestExecutionService, useValue: mockService }],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TestExecutionController>(TestExecutionController);
    jest.clearAllMocks();
  });

  describe('findAllByRelease', () => {
    it('should return paginated execution history', async () => {
      const expected = {
        data: [
          {
            id: 'exec-1',
            storyTitle: 'Login',
            status: TestStatus.PASS,
            attempt: 1,
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };

      mockService.findAllByRelease.mockResolvedValue(expected);

      const result = await controller.findAllByRelease('rel-1', {
        page: 1,
        limit: 20,
      });

      expect(result).toEqual(expected);
      expect(mockService.findAllByRelease).toHaveBeenCalledWith('rel-1', {
        page: 1,
        limit: 20,
      });
    });
  });

  describe('findLatestByRelease', () => {
    it('should return latest per-story status with summary', async () => {
      const expected = {
        stories: [
          {
            releaseStoryId: 'rs-1',
            storyTitle: 'Login',
            priority: Priority.HIGH,
            latestStatus: TestStatus.PASS,
          },
        ],
        summary: {
          total: 1,
          pass: 1,
          fail: 0,
          untested: 0,
          inProgress: 0,
          partiallyTested: 0,
          cantBeTested: 0,
        },
      };

      mockService.findLatestByRelease.mockResolvedValue(expected);

      const result = await controller.findLatestByRelease('rel-1');

      expect(result).toEqual(expected);
      expect(mockService.findLatestByRelease).toHaveBeenCalledWith('rel-1');
    });
  });

  describe('findOne', () => {
    it('should return execution detail', async () => {
      const expected = {
        id: 'exec-1',
        status: TestStatus.PASS,
        storyTitle: 'Login',
        testerName: 'John',
        stepResults: [],
      };

      mockService.findOne.mockResolvedValue(expected);

      const result = await controller.findOne('exec-1');

      expect(result).toEqual(expected);
      expect(mockService.findOne).toHaveBeenCalledWith('exec-1');
    });
  });
});

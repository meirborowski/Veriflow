import { Test, TestingModule } from '@nestjs/testing';
import { GitService } from './git.service';

const mockPull = jest.fn();
const mockClone = jest.fn();

jest.mock('simple-git', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

import simpleGit from 'simple-git';
import { existsSync } from 'fs';

const mockSimpleGit = simpleGit as jest.MockedFunction<typeof simpleGit>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;

describe('GitService', () => {
  let service: GitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GitService],
    }).compile();

    service = module.get<GitService>(GitService);
    jest.clearAllMocks();

    // Default: with dir arg → instance with pull; without → instance with clone
    mockSimpleGit.mockImplementation((dir?: unknown) => {
      if (dir) return { pull: mockPull } as unknown as ReturnType<typeof simpleGit>;
      return { clone: mockClone } as unknown as ReturnType<typeof simpleGit>;
    });
  });

  describe('prepare', () => {
    it('should clone when cache miss', async () => {
      mockExistsSync.mockReturnValue(false);
      mockClone.mockResolvedValue(undefined);

      const dir = await service.prepare('https://github.com/org/repo', 'main');

      expect(mockClone).toHaveBeenCalledWith(
        'https://github.com/org/repo',
        expect.stringContaining('/tmp/veriflow-repos/'),
        ['--depth', '1', '--branch', 'main'],
      );
      expect(dir).toContain('/tmp/veriflow-repos/');
    });

    it('should pull when cache exists', async () => {
      mockExistsSync.mockReturnValue(true);
      mockPull.mockResolvedValue(undefined);

      const dir = await service.prepare('https://github.com/org/repo', 'main');

      expect(mockPull).toHaveBeenCalledWith('origin', 'main');
      expect(dir).toContain('/tmp/veriflow-repos/');
    });

    it('should inject auth token into HTTPS URL', async () => {
      mockExistsSync.mockReturnValue(false);
      mockClone.mockResolvedValue(undefined);

      await service.prepare('https://github.com/org/repo', 'main', 'mytoken');

      expect(mockClone).toHaveBeenCalledWith(
        'https://mytoken@github.com/org/repo',
        expect.any(String),
        expect.any(Array),
      );
    });

    it('should produce consistent cache dirs for the same url+branch', async () => {
      mockExistsSync.mockReturnValue(false);
      mockClone.mockResolvedValue(undefined);

      const dir1 = await service.prepare('https://github.com/org/repo', 'main');
      const dir2 = await service.prepare('https://github.com/org/repo', 'main');

      expect(dir1).toEqual(dir2);
    });

    it('should produce different cache dirs for different branches', async () => {
      mockExistsSync.mockReturnValue(false);
      mockClone.mockResolvedValue(undefined);

      const dir1 = await service.prepare('https://github.com/org/repo', 'main');
      const dir2 = await service.prepare('https://github.com/org/repo', 'develop');

      expect(dir1).not.toEqual(dir2);
    });
  });
});

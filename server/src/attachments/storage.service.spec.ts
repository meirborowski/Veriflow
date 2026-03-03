import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;

  const mockConfig = {
    get: jest.fn().mockImplementation((key: string) => {
      const values: Record<string, string> = {
        MINIO_ENDPOINT: 'http://localhost:9000',
        MINIO_ACCESS_KEY: 'test-key',
        MINIO_SECRET_KEY: 'test-secret',
        MINIO_BUCKET: 'test-bucket',
        MINIO_USE_SSL: 'false',
      };
      return values[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize with config values', () => {
    expect(mockConfig.get).toHaveBeenCalledWith('MINIO_ENDPOINT');
    expect(mockConfig.get).toHaveBeenCalledWith('MINIO_ACCESS_KEY');
    expect(mockConfig.get).toHaveBeenCalledWith('MINIO_SECRET_KEY');
    expect(mockConfig.get).toHaveBeenCalledWith('MINIO_BUCKET');
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { StorageService } from './storage.service';
import { Attachment } from './entities/attachment.entity';
import { UserStory } from '../user-stories/entities/user-story.entity';
import { Bug } from '../bugs/entities/bug.entity';

describe('AttachmentsService', () => {
  let service: AttachmentsService;

  const mockAttachmentRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockStoryRepo = {
    findOne: jest.fn(),
  };

  const mockBugRepo = {
    findOne: jest.fn(),
  };

  const mockStorageService = {
    upload: jest.fn(),
    delete: jest.fn(),
    getSignedDownloadUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentsService,
        {
          provide: getRepositoryToken(Attachment),
          useValue: mockAttachmentRepo,
        },
        { provide: getRepositoryToken(UserStory), useValue: mockStoryRepo },
        { provide: getRepositoryToken(Bug), useValue: mockBugRepo },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<AttachmentsService>(AttachmentsService);
    jest.clearAllMocks();
  });

  describe('upload', () => {
    const mockFile = {
      originalname: 'test.png',
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    it('should upload a file for a story', async () => {
      mockStoryRepo.findOne.mockResolvedValue({ id: 'story-1' });
      mockAttachmentRepo.create.mockReturnValue({ id: 'att-1' });
      mockAttachmentRepo.save.mockResolvedValue({ id: 'att-1' });

      const result = await service.upload(
        mockFile,
        'story',
        'story-1',
        'user-1',
      );

      expect(mockStorageService.upload).toHaveBeenCalled();
      expect(mockAttachmentRepo.save).toHaveBeenCalled();
      expect(result).toEqual({ id: 'att-1' });
    });

    it('should upload a file for a bug', async () => {
      mockBugRepo.findOne.mockResolvedValue({ id: 'bug-1' });
      mockAttachmentRepo.create.mockReturnValue({ id: 'att-1' });
      mockAttachmentRepo.save.mockResolvedValue({ id: 'att-1' });

      const result = await service.upload(mockFile, 'bug', 'bug-1', 'user-1');

      expect(mockStorageService.upload).toHaveBeenCalled();
      expect(result).toEqual({ id: 'att-1' });
    });

    it('should reject files exceeding 10 MB', async () => {
      const largeFile = { ...mockFile, size: 11 * 1024 * 1024 };

      await expect(
        service.upload(
          largeFile as Express.Multer.File,
          'story',
          'story-1',
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject disallowed MIME types', async () => {
      const badFile = { ...mockFile, mimetype: 'application/zip' };

      await expect(
        service.upload(
          badFile as Express.Multer.File,
          'story',
          'story-1',
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent story', async () => {
      mockStoryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.upload(mockFile, 'story', 'missing-id', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent bug', async () => {
      mockBugRepo.findOne.mockResolvedValue(null);

      await expect(
        service.upload(mockFile, 'bug', 'missing-id', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid entity type', async () => {
      await expect(
        service.upload(mockFile, 'invalid', 'some-id', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByEntity', () => {
    it('should return attachments for an entity', async () => {
      const attachments = [{ id: 'att-1' }, { id: 'att-2' }];
      mockAttachmentRepo.find.mockResolvedValue(attachments);

      const result = await service.findByEntity('story', 'story-1');

      expect(result).toEqual(attachments);
      expect(mockAttachmentRepo.find).toHaveBeenCalledWith({
        where: { entityType: 'story', entityId: 'story-1' },
        relations: ['uploadedBy'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return an attachment by ID', async () => {
      mockAttachmentRepo.findOne.mockResolvedValue({ id: 'att-1' });

      const result = await service.findOne('att-1');
      expect(result).toEqual({ id: 'att-1' });
    });

    it('should throw NotFoundException for non-existent attachment', async () => {
      mockAttachmentRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getDownloadUrl', () => {
    it('should return a signed URL', async () => {
      mockAttachmentRepo.findOne.mockResolvedValue({
        id: 'att-1',
        storageKey: 'story/s1/file.png',
      });
      mockStorageService.getSignedDownloadUrl.mockResolvedValue(
        'https://signed-url',
      );

      const result = await service.getDownloadUrl('att-1');

      expect(result).toBe('https://signed-url');
      expect(mockStorageService.getSignedDownloadUrl).toHaveBeenCalledWith(
        'story/s1/file.png',
      );
    });
  });

  describe('remove', () => {
    it('should delete from storage and database', async () => {
      const attachment = { id: 'att-1', storageKey: 'story/s1/file.png' };
      mockAttachmentRepo.findOne.mockResolvedValue(attachment);

      await service.remove('att-1');

      expect(mockStorageService.delete).toHaveBeenCalledWith(
        'story/s1/file.png',
      );
      expect(mockAttachmentRepo.remove).toHaveBeenCalledWith(attachment);
    });
  });

  describe('resolveProjectId', () => {
    it('should resolve project from story attachment', async () => {
      mockAttachmentRepo.findOne.mockResolvedValue({
        id: 'att-1',
        entityType: 'story',
        entityId: 'story-1',
      });
      mockStoryRepo.findOne.mockResolvedValue({
        id: 'story-1',
        projectId: 'proj-1',
      });

      const result = await service.resolveProjectId('att-1');
      expect(result).toBe('proj-1');
    });

    it('should resolve project from bug attachment', async () => {
      mockAttachmentRepo.findOne.mockResolvedValue({
        id: 'att-1',
        entityType: 'bug',
        entityId: 'bug-1',
      });
      mockBugRepo.findOne.mockResolvedValue({
        id: 'bug-1',
        projectId: 'proj-1',
      });

      const result = await service.resolveProjectId('att-1');
      expect(result).toBe('proj-1');
    });

    it('should return null for non-existent attachment', async () => {
      mockAttachmentRepo.findOne.mockResolvedValue(null);

      const result = await service.resolveProjectId('bad-id');
      expect(result).toBeNull();
    });
  });
});

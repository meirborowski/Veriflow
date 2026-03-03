import { Test, TestingModule } from '@nestjs/testing';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { RolesGuard } from '../common/guards/roles.guard';

describe('AttachmentsController', () => {
  let controller: AttachmentsController;

  const mockService = {
    upload: jest.fn(),
    findByEntity: jest.fn(),
    getDownloadUrl: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttachmentsController],
      providers: [{ provide: AttachmentsService, useValue: mockService }],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AttachmentsController>(AttachmentsController);
    jest.clearAllMocks();
  });

  describe('upload', () => {
    it('should upload a file', async () => {
      const file = { originalname: 'test.png' } as Express.Multer.File;
      const user = { userId: 'user-1', email: 'test@test.com' };
      mockService.upload.mockResolvedValue({ id: 'att-1' });

      const result = await controller.upload(file, 'story', 'story-1', user);

      expect(mockService.upload).toHaveBeenCalledWith(
        file,
        'story',
        'story-1',
        'user-1',
      );
      expect(result).toEqual({ id: 'att-1' });
    });
  });

  describe('findByEntity', () => {
    it('should return attachments for an entity', async () => {
      mockService.findByEntity.mockResolvedValue([{ id: 'att-1' }]);

      const result = await controller.findByEntity('story', 'story-1');

      expect(mockService.findByEntity).toHaveBeenCalledWith('story', 'story-1');
      expect(result).toEqual([{ id: 'att-1' }]);
    });
  });

  describe('getDownloadUrl', () => {
    it('should return a download URL', async () => {
      mockService.getDownloadUrl.mockResolvedValue('https://signed-url');

      const result = await controller.getDownloadUrl('att-1');

      expect(result).toEqual({ url: 'https://signed-url' });
    });
  });

  describe('remove', () => {
    it('should delete an attachment', async () => {
      await controller.remove('att-1');
      expect(mockService.remove).toHaveBeenCalledWith('att-1');
    });
  });
});

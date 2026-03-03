import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Attachment } from './entities/attachment.entity';
import { StorageService } from './storage.service';
import { UserStory } from '../user-stories/entities/user-story.entity';
import { Bug } from '../bugs/entities/bug.entity';

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepository: Repository<Attachment>,
    @InjectRepository(UserStory)
    private readonly storyRepository: Repository<UserStory>,
    @InjectRepository(Bug)
    private readonly bugRepository: Repository<Bug>,
    private readonly storageService: StorageService,
  ) {}

  async upload(
    file: Express.Multer.File,
    entityType: string,
    entityId: string,
    userId: string,
  ): Promise<Attachment> {
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 10 MB limit');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type "${file.mimetype}" is not allowed`,
      );
    }

    await this.validateEntity(entityType, entityId);

    const storageKey = `${entityType}/${entityId}/${randomUUID()}`;
    await this.storageService.upload(storageKey, file.buffer, file.mimetype);

    const attachment = this.attachmentRepository.create({
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storageKey,
      entityType,
      entityId,
      uploadedById: userId,
    });

    return this.attachmentRepository.save(attachment);
  }

  async findByEntity(
    entityType: string,
    entityId: string,
  ): Promise<Attachment[]> {
    return this.attachmentRepository.find({
      where: { entityType, entityId },
      relations: ['uploadedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Attachment> {
    const attachment = await this.attachmentRepository.findOne({
      where: { id },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    return attachment;
  }

  async getDownloadUrl(id: string): Promise<string> {
    const attachment = await this.findOne(id);
    return this.storageService.getSignedDownloadUrl(attachment.storageKey);
  }

  async remove(id: string): Promise<void> {
    const attachment = await this.findOne(id);
    await this.storageService.delete(attachment.storageKey);
    await this.attachmentRepository.remove(attachment);
  }

  async resolveProjectId(attachmentId: string): Promise<string | null> {
    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId },
      select: ['id', 'entityType', 'entityId'],
    });

    if (!attachment) return null;

    if (attachment.entityType === 'story') {
      const story = await this.storyRepository.findOne({
        where: { id: attachment.entityId },
        select: ['id', 'projectId'],
      });
      return story?.projectId ?? null;
    }

    if (attachment.entityType === 'bug') {
      const bug = await this.bugRepository.findOne({
        where: { id: attachment.entityId },
        select: ['id', 'projectId'],
      });
      return bug?.projectId ?? null;
    }

    return null;
  }

  private async validateEntity(
    entityType: string,
    entityId: string,
  ): Promise<void> {
    if (entityType === 'story') {
      const story = await this.storyRepository.findOne({
        where: { id: entityId },
        select: ['id'],
      });
      if (!story) throw new NotFoundException('Story not found');
    } else if (entityType === 'bug') {
      const bug = await this.bugRepository.findOne({
        where: { id: entityId },
        select: ['id'],
      });
      if (!bug) throw new NotFoundException('Bug not found');
    } else {
      throw new BadRequestException(`Invalid entity type: ${entityType}`);
    }
  }
}

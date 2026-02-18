import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserStory } from './entities/user-story.entity';
import { VerificationStep } from './entities/verification-step.entity';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { StoryQueryDto } from './dto/story-query.dto';
import type { PaginatedResponse } from '../common/types/pagination';

export interface StoryListItem {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  stepCount: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UserStoriesService {
  private readonly logger = new Logger(UserStoriesService.name);

  constructor(
    @InjectRepository(UserStory)
    private readonly storyRepository: Repository<UserStory>,
    @InjectRepository(VerificationStep)
    private readonly stepRepository: Repository<VerificationStep>,
  ) {}

  async create(projectId: string, dto: CreateStoryDto): Promise<UserStory> {
    const story = this.storyRepository.create({
      projectId,
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
    });

    const savedStory = await this.storyRepository.save(story);

    const steps = dto.steps.map((step) =>
      this.stepRepository.create({
        storyId: savedStory.id,
        order: step.order,
        instruction: step.instruction,
      }),
    );

    await this.stepRepository.save(steps);

    this.logger.log(`Story created: id=${savedStory.id}, project=${projectId}`);

    return this.findOne(savedStory.id);
  }

  async findAllByProject(
    projectId: string,
    query: StoryQueryDto,
  ): Promise<PaginatedResponse<StoryListItem>> {
    const qb = this.storyRepository
      .createQueryBuilder('story')
      .leftJoin('story.steps', 'step')
      .select([
        'story.id AS id',
        'story.title AS title',
        'story.description AS description',
        'story.priority AS priority',
        'story.status AS status',
        'story.createdAt AS "createdAt"',
        'story.updatedAt AS "updatedAt"',
        'COUNT(step.id)::int AS "stepCount"',
      ])
      .where('story.projectId = :projectId', { projectId })
      .groupBy('story.id');

    if (query.status) {
      qb.andWhere('story.status = :status', { status: query.status });
    }

    if (query.priority) {
      qb.andWhere('story.priority = :priority', { priority: query.priority });
    }

    if (query.search) {
      qb.andWhere(
        '(story.title ILIKE :search OR story.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const countQb = this.storyRepository
      .createQueryBuilder('story')
      .where('story.projectId = :projectId', { projectId });

    if (query.status) {
      countQb.andWhere('story.status = :status', { status: query.status });
    }
    if (query.priority) {
      countQb.andWhere('story.priority = :priority', {
        priority: query.priority,
      });
    }
    if (query.search) {
      countQb.andWhere(
        '(story.title ILIKE :search OR story.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const total = await countQb.getCount();

    const data = await qb
      .orderBy('story.createdAt', 'DESC')
      .offset((query.page - 1) * query.limit)
      .limit(query.limit)
      .getRawMany<StoryListItem>();

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(storyId: string): Promise<UserStory> {
    const story = await this.storyRepository.findOne({
      where: { id: storyId },
      relations: ['steps'],
      order: { steps: { order: 'ASC' } },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    return story;
  }

  async update(storyId: string, dto: UpdateStoryDto): Promise<UserStory> {
    const story = await this.storyRepository.findOne({
      where: { id: storyId },
      relations: ['steps'],
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    const { steps: stepsDto, ...scalarFields } = dto;

    if (Object.keys(scalarFields).length > 0) {
      Object.assign(story, scalarFields);
      await this.storyRepository.save(story);
    }

    if (stepsDto) {
      await this.syncSteps(story, stepsDto);
    }

    this.logger.log(`Story updated: id=${storyId}`);

    return this.findOne(storyId);
  }

  async remove(storyId: string): Promise<void> {
    const story = await this.storyRepository.findOne({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    await this.storyRepository.remove(story);

    this.logger.log(`Story deleted: id=${storyId}`);
  }

  private async syncSteps(
    story: UserStory,
    stepsDto: UpdateStoryDto['steps'],
  ): Promise<void> {
    if (!stepsDto) return;

    const existingIds = story.steps.map((s) => s.id);
    const incomingIds = stepsDto.filter((s) => s.id).map((s) => s.id!);

    // Validate all provided step IDs belong to this story
    const invalidIds = incomingIds.filter((id) => !existingIds.includes(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Step IDs do not belong to this story: ${invalidIds.join(', ')}`,
      );
    }

    // Delete steps not in the incoming array
    const toDelete = existingIds.filter((id) => !incomingIds.includes(id));
    if (toDelete.length > 0) {
      await this.stepRepository.delete({ id: In(toDelete) });
    }

    // Update existing steps and create new ones
    for (const stepDto of stepsDto) {
      if (stepDto.id) {
        await this.stepRepository.update(stepDto.id, {
          order: stepDto.order,
          instruction: stepDto.instruction,
        });
      } else {
        const newStep = this.stepRepository.create({
          storyId: story.id,
          order: stepDto.order,
          instruction: stepDto.instruction,
        });
        await this.stepRepository.save(newStep);
      }
    }
  }
}

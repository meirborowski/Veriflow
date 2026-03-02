import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
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
    private readonly dataSource: DataSource,
  ) {}

  async create(projectId: string, dto: CreateStoryDto): Promise<UserStory> {
    const storyId = await this.dataSource.transaction(async (manager) => {
      const storyRepo = manager.getRepository(UserStory);
      const stepRepo = manager.getRepository(VerificationStep);

      const story = storyRepo.create({
        projectId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
      });

      const savedStory = await storyRepo.save(story);

      const steps = dto.steps.map((step) =>
        stepRepo.create({
          storyId: savedStory.id,
          order: step.order,
          instruction: step.instruction,
        }),
      );

      await stepRepo.save(steps);

      this.logger.log(
        `Story created: id=${savedStory.id}, project=${projectId}`,
      );

      return savedStory.id;
    });

    return this.findOne(storyId);
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

    this.applyFilters(qb, query);

    const countQb = this.storyRepository
      .createQueryBuilder('story')
      .where('story.projectId = :projectId', { projectId });

    this.applyFilters(countQb, query);

    const total = await countQb.getCount();

    const allowedSort: Record<string, string> = {
      createdAt: 'story.createdAt',
      title: 'story.title',
      priority: 'story.priority',
      status: 'story.status',
    };
    const sortColumn = allowedSort[query.orderBy ?? ''] ?? 'story.createdAt';
    const sortDir = query.sortDir === 'ASC' ? 'ASC' : 'DESC';

    const data = await qb
      .orderBy(sortColumn, sortDir)
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

    await this.dataSource.transaction(async (manager) => {
      if (Object.keys(scalarFields).length > 0) {
        Object.assign(story, scalarFields);
        await manager.getRepository(UserStory).save(story);
      }

      if (stepsDto) {
        await this.syncSteps(story, stepsDto, manager);
      }
    });

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

  private applyFilters(
    qb: SelectQueryBuilder<UserStory>,
    query: StoryQueryDto,
  ): void {
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
  }

  private async syncSteps(
    story: UserStory,
    stepsDto: NonNullable<UpdateStoryDto['steps']>,
    manager: EntityManager,
  ): Promise<void> {
    const stepRepo = manager.getRepository(VerificationStep);

    const existingIds = story.steps.map((s) => s.id);
    const incomingIds = stepsDto.filter((s) => s.id).map((s) => s.id!);

    // Validate all provided step IDs belong to this story
    const invalidIds = incomingIds.filter((id) => !existingIds.includes(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Step IDs do not belong to this story: ${invalidIds.join(', ')}`,
      );
    }

    // Validate at least one step remains
    const newStepCount = stepsDto.length;
    if (newStepCount === 0) {
      throw new BadRequestException(
        'A story must have at least one verification step',
      );
    }

    // Delete steps not in the incoming array
    const toDelete = existingIds.filter((id) => !incomingIds.includes(id));
    if (toDelete.length > 0) {
      await stepRepo.delete({ id: In(toDelete) });
    }

    // Batch update existing steps and create new ones
    const toUpdate: VerificationStep[] = [];
    const toCreate: VerificationStep[] = [];

    for (const stepDto of stepsDto) {
      if (stepDto.id) {
        toUpdate.push(
          stepRepo.create({
            id: stepDto.id,
            storyId: story.id,
            order: stepDto.order,
            instruction: stepDto.instruction,
          }),
        );
      } else {
        toCreate.push(
          stepRepo.create({
            storyId: story.id,
            order: stepDto.order,
            instruction: stepDto.instruction,
          }),
        );
      }
    }

    if (toUpdate.length > 0) {
      await stepRepo.save(toUpdate);
    }
    if (toCreate.length > 0) {
      await stepRepo.save(toCreate);
    }
  }
}

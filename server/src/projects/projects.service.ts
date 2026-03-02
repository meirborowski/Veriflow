import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { User } from '../auth/entities/user.entity';
import { UserRole, NotificationType } from '../common/types/enums';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import type { ProjectQueryDto } from './dto/project-query.dto';
import type { PaginatedResponse } from '../common/types/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

export interface ProjectWithRole {
  id: string;
  name: string;
  description: string | null;
  role: UserRole;
  createdAt: Date;
}

export interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  members: {
    userId: string;
    name: string;
    email: string;
    role: UserRole;
  }[];
}

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly memberRepository: Repository<ProjectMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(userId: string, dto: CreateProjectDto): Promise<Project> {
    const project = this.projectRepository.create({
      name: dto.name,
      description: dto.description ?? null,
    });

    const savedProject = await this.projectRepository.save(project);

    const member = this.memberRepository.create({
      userId,
      projectId: savedProject.id,
      role: UserRole.ADMIN,
    });

    await this.memberRepository.save(member);

    this.logger.log(
      `Project created: id=${savedProject.id}, creator=${userId}`,
    );

    return savedProject;
  }

  async findAllForUser(
    userId: string,
    query: ProjectQueryDto,
  ): Promise<PaginatedResponse<ProjectWithRole>> {
    const qb = this.memberRepository
      .createQueryBuilder('member')
      .select([
        'project.id AS id',
        'project.name AS name',
        'project.description AS description',
        'member.role AS role',
        'project.createdAt AS "createdAt"',
      ])
      .innerJoin('projects', 'project', 'project.id = member.projectId')
      .where('member.userId = :userId', { userId });

    if (query.search) {
      qb.andWhere('project.name ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    const countQb = this.memberRepository
      .createQueryBuilder('member')
      .innerJoin('projects', 'project', 'project.id = member.projectId')
      .where('member.userId = :userId', { userId });

    if (query.search) {
      countQb.andWhere('project.name ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    const total = await countQb.getCount();

    const allowedSort: Record<string, string> = {
      createdAt: 'project.createdAt',
      name: 'project.name',
    };
    const sortColumn = allowedSort[query.orderBy ?? ''] ?? 'project.createdAt';
    const sortDir = query.sortDir === 'ASC' ? 'ASC' : 'DESC';

    const data = await qb
      .orderBy(sortColumn, sortDir)
      .offset((query.page - 1) * query.limit)
      .limit(query.limit)
      .getRawMany<ProjectWithRole>();

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

  async findOne(projectId: string, userId: string): Promise<ProjectDetail> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['members', 'members.user'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isMember = project.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('Not a member of this project');
    }

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      members: project.members.map((m) => ({
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      })),
    };
  }

  async update(projectId: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    Object.assign(project, dto);
    const updated = await this.projectRepository.save(project);

    this.logger.log(`Project updated: id=${projectId}`);

    return updated;
  }

  async remove(projectId: string): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.projectRepository.remove(project);

    this.logger.log(`Project deleted: id=${projectId}`);
  }

  async addMember(
    projectId: string,
    dto: AddMemberDto,
  ): Promise<ProjectMember> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.memberRepository.findOne({
      where: { userId: user.id, projectId },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this project');
    }

    const member = this.memberRepository.create({
      userId: user.id,
      projectId,
      role: dto.role,
    });

    const saved = await this.memberRepository.save(member);

    this.logger.log(
      `Member added: project=${projectId}, user=${user.id}, role=${dto.role}`,
    );

    // Notify the invited user
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      select: ['id', 'name'],
    });

    if (project) {
      const notification = await this.notificationsService.create({
        userId: user.id,
        type: NotificationType.MEMBER_ADDED,
        title: 'Added to project',
        message: `You have been added to project "${project.name}" as ${dto.role}`,
        relatedEntityType: 'project',
        relatedEntityId: projectId,
      });
      this.notificationsGateway.notifyUser(user.id, notification);
    }

    return saved;
  }

  async updateMemberRole(
    projectId: string,
    userId: string,
    dto: UpdateMemberRoleDto,
  ): Promise<ProjectMember> {
    const member = await this.memberRepository.findOne({
      where: { userId, projectId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === UserRole.ADMIN && dto.role !== UserRole.ADMIN) {
      const adminCount = await this.memberRepository.count({
        where: { projectId, role: UserRole.ADMIN },
      });

      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot demote the last admin of a project',
        );
      }
    }

    member.role = dto.role;
    const updated = await this.memberRepository.save(member);

    this.logger.log(
      `Member role updated: project=${projectId}, user=${userId}, role=${dto.role}`,
    );

    return updated;
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    const member = await this.memberRepository.findOne({
      where: { userId, projectId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === UserRole.ADMIN) {
      const adminCount = await this.memberRepository.count({
        where: { projectId, role: UserRole.ADMIN },
      });

      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the last admin from a project',
        );
      }
    }

    await this.memberRepository.remove(member);

    this.logger.log(`Member removed: project=${projectId}, user=${userId}`);
  }
}

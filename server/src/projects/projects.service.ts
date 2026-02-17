import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../common/types/enums';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import type { PaginatedResponse } from '../common/types/pagination';

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
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<ProjectWithRole>> {
    const [members, total] = await this.memberRepository.findAndCount({
      where: { userId },
      relations: ['project'],
      order: { project: { createdAt: 'DESC' } },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data: ProjectWithRole[] = members.map((m) => ({
      id: m.project.id,
      name: m.project.name,
      description: m.project.description,
      role: m.role,
      createdAt: m.project.createdAt,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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

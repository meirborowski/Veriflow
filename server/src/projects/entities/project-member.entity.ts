import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  PrimaryColumn,
} from 'typeorm';
import { UserRole } from '../../common/types/enums';
import { Project } from './project.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('project_members')
export class ProjectMember {
  @PrimaryColumn('uuid')
  userId: string;

  @PrimaryColumn('uuid')
  projectId: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @CreateDateColumn({ type: 'timestamptz' })
  joinedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Project, (project) => project.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'projectId' })
  project: Project;
}

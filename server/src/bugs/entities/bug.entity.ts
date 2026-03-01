import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BugSeverity, BugStatus } from '../../common/types/enums';
import { Project } from '../../projects/entities/project.entity';
import { UserStory } from '../../user-stories/entities/user-story.entity';
import { TestExecution } from '../../test-execution/entities/test-execution.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('bugs')
export class Bug {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @Column('uuid')
  storyId: string;

  @Column({ type: 'uuid', nullable: true })
  executionId: string | null;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: BugSeverity })
  severity: BugSeverity;

  @Column({ type: 'enum', enum: BugStatus, default: BugStatus.OPEN })
  status: BugStatus;

  @Column('uuid')
  reportedById: string;

  @Column({ type: 'uuid', nullable: true })
  assignedToId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @ManyToOne(() => UserStory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storyId' })
  story: UserStory;

  @ManyToOne(() => TestExecution, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'executionId' })
  execution: TestExecution | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reportedById' })
  reportedBy: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User | null;
}

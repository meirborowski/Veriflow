import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Priority, StoryStatus } from '../../common/types/enums';
import { Project } from '../../projects/entities/project.entity';
import { VerificationStep } from './verification-step.entity';

@Entity('user_stories')
export class UserStory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: Priority })
  priority: Priority;

  @Column({ type: 'enum', enum: StoryStatus, default: StoryStatus.DRAFT })
  status: StoryStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @OneToMany(() => VerificationStep, (step) => step.story, { cascade: true })
  steps: VerificationStep[];
}

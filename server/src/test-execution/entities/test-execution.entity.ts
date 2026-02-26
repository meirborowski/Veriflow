import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { TestStatus } from '../../common/types/enums';
import { Release } from '../../releases/entities/release.entity';
import { ReleaseStory } from '../../releases/entities/release-story.entity';
import { User } from '../../auth/entities/user.entity';
import { StepResult } from './step-result.entity';

@Entity('test_executions')
export class TestExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  releaseId: string;

  @Column('uuid')
  releaseStoryId: string;

  @Column('uuid')
  assignedToUserId: string;

  @Column({ type: 'int', default: 1 })
  attempt: number;

  @Column({
    type: 'enum',
    enum: TestStatus,
    default: TestStatus.IN_PROGRESS,
  })
  status: TestStatus;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @ManyToOne(() => Release, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'releaseId' })
  release: Release;

  @ManyToOne(() => ReleaseStory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'releaseStoryId' })
  releaseStory: ReleaseStory;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignedToUserId' })
  assignedToUser: User;

  @OneToMany(() => StepResult, (stepResult) => stepResult.execution, {
    cascade: true,
  })
  stepResults: StepResult[];
}

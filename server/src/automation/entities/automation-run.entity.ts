import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { PlaywrightTest } from './playwright-test.entity';
import { Release } from '../../releases/entities/release.entity';
import {
  AutomationRunStatus,
  AutomationTrigger,
} from '../../common/types/enums';

@Entity('automation_runs')
@Index(['projectId', 'testId'])
@Index(['projectId', 'status'])
export class AutomationRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column('uuid')
  testId: string;

  @ManyToOne(() => PlaywrightTest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'testId' })
  test: PlaywrightTest;

  @Column({ type: 'uuid', nullable: true })
  releaseId: string | null;

  @ManyToOne(() => Release, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'releaseId' })
  release: Release | null;

  @Column({
    type: 'enum',
    enum: AutomationRunStatus,
    default: AutomationRunStatus.QUEUED,
  })
  status: AutomationRunStatus;

  @Column({ type: 'enum', enum: AutomationTrigger })
  triggeredBy: AutomationTrigger;

  @Column({ type: 'int', nullable: true })
  duration: number | null;

  @Column({ type: 'timestamptz' })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'text', nullable: true })
  logs: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalRunId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

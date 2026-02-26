import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StepStatus } from '../../common/types/enums';
import { TestExecution } from './test-execution.entity';
import { ReleaseStoryStep } from '../../releases/entities/release-story-step.entity';

@Entity('step_results')
export class StepResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  executionId: string;

  @Column('uuid')
  releaseStoryStepId: string;

  @Column({ type: 'enum', enum: StepStatus })
  status: StepStatus;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @ManyToOne(() => TestExecution, (execution) => execution.stepResults, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'executionId' })
  execution: TestExecution;

  @ManyToOne(() => ReleaseStoryStep, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'releaseStoryStepId' })
  releaseStoryStep: ReleaseStoryStep;
}

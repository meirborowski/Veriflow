import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserStory } from './user-story.entity';

@Entity('verification_steps')
export class VerificationStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  storyId: string;

  @Column({ type: 'int' })
  order: number;

  @Column({ type: 'text' })
  instruction: string;

  @ManyToOne(() => UserStory, (story) => story.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storyId' })
  story: UserStory;
}

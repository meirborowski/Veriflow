import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ReleaseStory } from './release-story.entity';

@Entity('release_story_steps')
export class ReleaseStoryStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  releaseStoryId: string;

  @Column({ type: 'int' })
  order: number;

  @Column({ type: 'text' })
  instruction: string;

  @ManyToOne(() => ReleaseStory, (story) => story.steps, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'releaseStoryId' })
  releaseStory: ReleaseStory;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Priority } from '../../common/types/enums';
import { Release } from './release.entity';
import { UserStory } from '../../user-stories/entities/user-story.entity';
import { ReleaseStoryStep } from './release-story-step.entity';

@Entity('release_stories')
export class ReleaseStory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  releaseId: string;

  @Column({ type: 'uuid', nullable: true })
  sourceStoryId: string | null;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: Priority })
  priority: Priority;

  @ManyToOne(() => Release, (release) => release.stories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'releaseId' })
  release: Release;

  @ManyToOne(() => UserStory, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'sourceStoryId' })
  sourceStory: UserStory;

  @OneToMany(() => ReleaseStoryStep, (step) => step.releaseStory, {
    cascade: true,
  })
  steps: ReleaseStoryStep[];
}

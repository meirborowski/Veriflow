import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { UserStory } from '../../user-stories/entities/user-story.entity';
import { PlaywrightTest } from './playwright-test.entity';
import { LinkSource } from '../../common/types/enums';

@Entity('story_test_links')
@Unique(['storyId', 'testId'])
export class StoryTestLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  storyId: string;

  @ManyToOne(() => UserStory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storyId' })
  story: UserStory;

  @Column('uuid')
  testId: string;

  @ManyToOne(() => PlaywrightTest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'testId' })
  test: PlaywrightTest;

  @Column({ type: 'enum', enum: LinkSource })
  linkedBy: LinkSource;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

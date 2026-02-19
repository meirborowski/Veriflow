import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { ReleaseStatus } from '../../common/types/enums';
import { Project } from '../../projects/entities/project.entity';
import { UserStory } from '../../user-stories/entities/user-story.entity';
import { ReleaseStory } from './release-story.entity';

@Entity('releases')
export class Release {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ReleaseStatus, default: ReleaseStatus.DRAFT })
  status: ReleaseStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @OneToMany(() => ReleaseStory, (releaseStory) => releaseStory.release, {
    cascade: true,
  })
  stories: ReleaseStory[];

  @ManyToMany(() => UserStory)
  @JoinTable({
    name: 'release_scoped_stories',
    joinColumn: { name: 'releaseId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'storyId', referencedColumnName: 'id' },
  })
  scopedStories: UserStory[];
}

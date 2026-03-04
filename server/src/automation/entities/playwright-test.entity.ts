import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity('playwright_tests')
@Unique(['projectId', 'externalId'])
@Index(['projectId'])
export class PlaywrightTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ length: 255 })
  externalId: string;

  @Column({ length: 512 })
  testFile: string;

  @Column({ length: 255 })
  testName: string;

  @Column('text', { array: true, default: [] })
  tags: string[];

  @Column({ type: 'timestamptz', nullable: true })
  lastSyncedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

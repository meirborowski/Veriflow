import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity('project_repo_configs')
export class ProjectRepoConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'varchar', length: 512 })
  repoUrl: string;

  @Column({ type: 'varchar', length: 255, default: 'main' })
  branch: string;

  @Column({ type: 'varchar', length: 255, default: 'tests' })
  testDirectory: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  playwrightConfig: string | null;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  authToken: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

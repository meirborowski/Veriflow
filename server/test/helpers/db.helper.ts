import { DataSource } from 'typeorm';
import { User } from '../../src/auth/entities/user.entity';
import { Project } from '../../src/projects/entities/project.entity';
import { ProjectMember } from '../../src/projects/entities/project-member.entity';
import { UserStory } from '../../src/user-stories/entities/user-story.entity';
import { VerificationStep } from '../../src/user-stories/entities/verification-step.entity';
import { Release } from '../../src/releases/entities/release.entity';
import { ReleaseStory } from '../../src/releases/entities/release-story.entity';
import { ReleaseStoryStep } from '../../src/releases/entities/release-story-step.entity';
import { TestExecution } from '../../src/test-execution/entities/test-execution.entity';
import { StepResult } from '../../src/test-execution/entities/step-result.entity';
import { Bug } from '../../src/bugs/entities/bug.entity';
import { getTestDatabaseUrl } from '../test-db-url';

export { getTestDatabaseUrl };

let dataSource: DataSource | null = null;

export async function initTestDataSource(): Promise<DataSource> {
  if (dataSource && dataSource.isInitialized) {
    return dataSource;
  }

  dataSource = new DataSource({
    type: 'postgres',
    url: getTestDatabaseUrl(),
    entities: [
      User,
      Project,
      ProjectMember,
      UserStory,
      VerificationStep,
      Release,
      ReleaseStory,
      ReleaseStoryStep,
      TestExecution,
      StepResult,
      Bug,
    ],
    synchronize: true,
  });

  await dataSource.initialize();
  return dataSource;
}

export async function truncateAll(ds?: DataSource): Promise<void> {
  const source = ds ?? dataSource;
  if (!source || !source.isInitialized) {
    throw new Error('DataSource not initialized');
  }

  await source.query(`
    TRUNCATE
      step_results,
      test_executions,
      release_story_steps,
      release_stories,
      release_scoped_stories,
      bugs,
      verification_steps,
      user_stories,
      project_members,
      releases,
      projects,
      users
    CASCADE
  `);
}

export async function closeTestDataSource(): Promise<void> {
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
    dataSource = null;
  }
}

export function getDataSource(): DataSource {
  if (!dataSource || !dataSource.isInitialized) {
    throw new Error('DataSource not initialized');
  }
  return dataSource;
}

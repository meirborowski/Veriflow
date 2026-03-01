import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
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
import {
  UserRole,
  Priority,
  StoryStatus,
  ReleaseStatus,
  TestStatus,
  StepStatus,
} from '../../src/common/types/enums';

// ── HTTP-based (for E2E tests) ──────────────────────────────────────

export async function createProject(
  app: INestApplication,
  authHeader: string,
  name?: string,
): Promise<{ id: string; name: string }> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/projects')
    .set('Authorization', authHeader)
    .send({ name: name ?? `Project ${randomUUID().slice(0, 8)}` })
    .expect(201);
  return res.body as { id: string; name: string };
}

export async function addProjectMember(
  app: INestApplication,
  authHeader: string,
  projectId: string,
  email: string,
  role: UserRole,
): Promise<{ userId: string; projectId: string; role: UserRole }> {
  const res = await request(app.getHttpServer())
    .post(`/api/v1/projects/${projectId}/members`)
    .set('Authorization', authHeader)
    .send({ email, role })
    .expect(201);
  return res.body as { userId: string; projectId: string; role: UserRole };
}

export async function createStory(
  app: INestApplication,
  authHeader: string,
  projectId: string,
  overrides?: {
    title?: string;
    description?: string;
    priority?: Priority;
    steps?: { order: number; instruction: string }[];
  },
): Promise<{
  id: string;
  title: string;
  priority: Priority;
  steps: { id: string; order: number; instruction: string }[];
}> {
  const res = await request(app.getHttpServer())
    .post(`/api/v1/projects/${projectId}/stories`)
    .set('Authorization', authHeader)
    .send({
      title: overrides?.title ?? `Story ${randomUUID().slice(0, 8)}`,
      description: overrides?.description ?? 'Test story description',
      priority: overrides?.priority ?? Priority.MEDIUM,
      steps: overrides?.steps ?? [
        { order: 1, instruction: 'Step 1' },
        { order: 2, instruction: 'Step 2' },
      ],
    })
    .expect(201);
  return res.body as {
    id: string;
    title: string;
    priority: Priority;
    steps: { id: string; order: number; instruction: string }[];
  };
}

export async function createRelease(
  app: INestApplication,
  authHeader: string,
  projectId: string,
  name?: string,
): Promise<{ id: string; name: string; status: ReleaseStatus }> {
  const res = await request(app.getHttpServer())
    .post(`/api/v1/projects/${projectId}/releases`)
    .set('Authorization', authHeader)
    .send({ name: name ?? `Release ${randomUUID().slice(0, 8)}` })
    .expect(201);
  return res.body as { id: string; name: string; status: ReleaseStatus };
}

export async function addStoriesToRelease(
  app: INestApplication,
  authHeader: string,
  releaseId: string,
  storyIds: string[],
): Promise<{ added: number }> {
  const res = await request(app.getHttpServer())
    .post(`/api/v1/releases/${releaseId}/stories`)
    .set('Authorization', authHeader)
    .send({ storyIds })
    .expect(201);
  return res.body as { added: number };
}

export async function closeRelease(
  app: INestApplication,
  authHeader: string,
  releaseId: string,
): Promise<{ id: string; status: ReleaseStatus; storyCount: number }> {
  const res = await request(app.getHttpServer())
    .post(`/api/v1/releases/${releaseId}/close`)
    .set('Authorization', authHeader)
    .expect(201);
  return res.body as { id: string; status: ReleaseStatus; storyCount: number };
}

// ── DB-based (for integration tests) ────────────────────────────────

export async function seedUser(
  ds: DataSource,
  overrides?: { email?: string; name?: string; password?: string },
): Promise<User> {
  const repo = ds.getRepository(User);
  const password = overrides?.password ?? 'Password123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = repo.create({
    email: overrides?.email ?? `test-${randomUUID()}@example.com`,
    name: overrides?.name ?? 'Test User',
    password: hashedPassword,
  });

  return repo.save(user);
}

export async function seedProject(
  ds: DataSource,
  adminUserId: string,
  name?: string,
): Promise<Project> {
  const projectRepo = ds.getRepository(Project);
  const memberRepo = ds.getRepository(ProjectMember);

  const project = projectRepo.create({
    name: name ?? `Project ${randomUUID().slice(0, 8)}`,
  });
  const saved = await projectRepo.save(project);

  const member = memberRepo.create({
    userId: adminUserId,
    projectId: saved.id,
    role: UserRole.ADMIN,
  });
  await memberRepo.save(member);

  return saved;
}

export async function seedProjectMember(
  ds: DataSource,
  projectId: string,
  userId: string,
  role: UserRole,
): Promise<ProjectMember> {
  const repo = ds.getRepository(ProjectMember);
  const member = repo.create({ userId, projectId, role });
  return repo.save(member);
}

export async function seedStoryWithSteps(
  ds: DataSource,
  projectId: string,
  overrides?: {
    title?: string;
    description?: string;
    priority?: Priority;
    status?: StoryStatus;
    steps?: { order: number; instruction: string }[];
  },
): Promise<UserStory> {
  const storyRepo = ds.getRepository(UserStory);
  const stepRepo = ds.getRepository(VerificationStep);

  const story = storyRepo.create({
    projectId,
    title: overrides?.title ?? `Story ${randomUUID().slice(0, 8)}`,
    description: overrides?.description ?? 'Test description',
    priority: overrides?.priority ?? Priority.MEDIUM,
    status: overrides?.status ?? StoryStatus.DRAFT,
  });
  const savedStory = await storyRepo.save(story);

  const stepsData = overrides?.steps ?? [
    { order: 1, instruction: 'Step 1' },
    { order: 2, instruction: 'Step 2' },
  ];

  const steps = stepsData.map((s) =>
    stepRepo.create({
      storyId: savedStory.id,
      order: s.order,
      instruction: s.instruction,
    }),
  );
  await stepRepo.save(steps);

  return storyRepo.findOne({
    where: { id: savedStory.id },
    relations: ['steps'],
  }) as Promise<UserStory>;
}

export async function seedClosedRelease(
  ds: DataSource,
  projectId: string,
  stories: UserStory[],
): Promise<{
  release: Release;
  releaseStories: ReleaseStory[];
}> {
  const releaseRepo = ds.getRepository(Release);
  const rsRepo = ds.getRepository(ReleaseStory);
  const rssRepo = ds.getRepository(ReleaseStoryStep);

  const release = releaseRepo.create({
    projectId,
    name: `Release ${randomUUID().slice(0, 8)}`,
    status: ReleaseStatus.CLOSED,
    closedAt: new Date(),
  });
  const savedRelease = await releaseRepo.save(release);

  // Also add to scoped stories junction table
  await ds.query(
    `INSERT INTO release_scoped_stories ("releaseId", "storyId")
     VALUES ${stories.map((_, i) => `($1, $${i + 2})`).join(', ')}`,
    [savedRelease.id, ...stories.map((s) => s.id)],
  );

  const releaseStories: ReleaseStory[] = [];

  for (const story of stories) {
    const rs = rsRepo.create({
      releaseId: savedRelease.id,
      sourceStoryId: story.id,
      title: story.title,
      description: story.description,
      priority: story.priority,
    });
    const savedRs = await rsRepo.save(rs);

    if (story.steps && story.steps.length > 0) {
      const stepSnapshots = story.steps.map((step) =>
        rssRepo.create({
          releaseStoryId: savedRs.id,
          order: step.order,
          instruction: step.instruction,
        }),
      );
      await rssRepo.save(stepSnapshots);
    }

    const fullRs = await rsRepo.findOne({
      where: { id: savedRs.id },
      relations: ['steps'],
    });
    releaseStories.push(fullRs!);
  }

  return { release: savedRelease, releaseStories };
}

export async function seedExecution(
  ds: DataSource,
  releaseId: string,
  releaseStoryId: string,
  userId: string,
  overrides?: {
    status?: TestStatus;
    attempt?: number;
    completedAt?: Date | null;
  },
): Promise<TestExecution> {
  const repo = ds.getRepository(TestExecution);
  const execution = repo.create({
    releaseId,
    releaseStoryId,
    assignedToUserId: userId,
    status: overrides?.status ?? TestStatus.IN_PROGRESS,
    attempt: overrides?.attempt ?? 1,
    completedAt: overrides?.completedAt ?? null,
  });
  return repo.save(execution);
}

export async function seedStepResult(
  ds: DataSource,
  executionId: string,
  releaseStoryStepId: string,
  status: StepStatus,
): Promise<StepResult> {
  const repo = ds.getRepository(StepResult);
  const result = repo.create({
    executionId,
    releaseStoryStepId,
    status,
  });
  return repo.save(result);
}

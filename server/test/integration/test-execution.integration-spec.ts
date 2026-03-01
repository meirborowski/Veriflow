import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../helpers/app.helper';
import {
  truncateAll,
  initTestDataSource,
  closeTestDataSource,
  getDataSource,
} from '../helpers/db.helper';
import {
  seedUser,
  seedProject,
  seedProjectMember,
  seedStoryWithSteps,
  seedClosedRelease,
  seedExecution,
} from '../helpers/seed.helper';
import { TestExecutionService } from '../../src/test-execution/test-execution.service';
import { TestExecution } from '../../src/test-execution/entities/test-execution.entity';
import { UserRole, Priority, TestStatus } from '../../src/common/types/enums';

describe('Test Execution Integration', () => {
  let app: INestApplication;
  let executionService: TestExecutionService;

  beforeAll(async () => {
    await initTestDataSource();
    await truncateAll();
    app = await createTestApp();
    executionService = app.get(TestExecutionService);
  });

  afterAll(async () => {
    await app.close();
    await closeTestDataSource();
  });

  describe('Priority ordering', () => {
    it('should assign CRITICAL stories before LOW', async () => {
      const ds = getDataSource();
      await truncateAll(ds);

      const user = await seedUser(ds);
      const tester = await seedUser(ds);
      const project = await seedProject(ds, user.id);
      await seedProjectMember(ds, project.id, tester.id, UserRole.TESTER);

      const lowStory = await seedStoryWithSteps(ds, project.id, {
        title: 'Low Priority',
        priority: Priority.LOW,
      });
      const critStory = await seedStoryWithSteps(ds, project.id, {
        title: 'Critical Priority',
        priority: Priority.CRITICAL,
      });

      const { releaseStories } = await seedClosedRelease(ds, project.id, [
        lowStory,
        critStory,
      ]);

      const critRs = releaseStories.find(
        (rs) => rs.sourceStoryId === critStory.id,
      );

      const assigned = await executionService.assignStory(
        releaseStories[0].releaseId,
        tester.id,
      );

      expect(assigned).not.toBeNull();
      expect(assigned!.releaseStory.id).toBe(critRs!.id);
    });
  });

  describe('No double-booking', () => {
    it('should not assign same story to multiple testers concurrently', async () => {
      const ds = getDataSource();
      await truncateAll(ds);

      const admin = await seedUser(ds);
      const project = await seedProject(ds, admin.id);

      // Create 3 stories
      const stories = [];
      for (let i = 0; i < 3; i++) {
        stories.push(
          await seedStoryWithSteps(ds, project.id, { title: `Story ${i}` }),
        );
      }

      const { release } = await seedClosedRelease(ds, project.id, stories);

      // Create 6 testers
      const testers = [];
      for (let i = 0; i < 6; i++) {
        const t = await seedUser(ds, { email: `tester-${i}@test.com` });
        await seedProjectMember(ds, project.id, t.id, UserRole.TESTER);
        testers.push(t);
      }

      // All 6 request work concurrently — some may throw due to lock contention
      await Promise.all(
        testers.map((t) =>
          executionService.assignStory(release.id, t.id).catch(() => null),
        ),
      );

      // The real invariant: check DB state after all operations complete.
      // No story should have more than one IN_PROGRESS execution.
      const executions = await ds.getRepository(TestExecution).find({
        where: { releaseId: release.id, status: TestStatus.IN_PROGRESS },
      });

      // At most 3 stories → at most 3 IN_PROGRESS executions
      expect(executions.length).toBeLessThanOrEqual(3);
      expect(executions.length).toBeGreaterThanOrEqual(1);

      // Each story should appear at most once
      const storyIds = executions.map((e) => e.releaseStoryId);
      const uniqueStoryIds = new Set(storyIds);
      expect(uniqueStoryIds.size).toBe(executions.length);
    });
  });

  describe('Story pool exclusions', () => {
    it('should exclude PASS and IN_PROGRESS stories from pool', async () => {
      const ds = getDataSource();
      await truncateAll(ds);

      const admin = await seedUser(ds);
      const tester1 = await seedUser(ds);
      const tester2 = await seedUser(ds);
      const project = await seedProject(ds, admin.id);
      await seedProjectMember(ds, project.id, tester1.id, UserRole.TESTER);
      await seedProjectMember(ds, project.id, tester2.id, UserRole.TESTER);

      const storyA = await seedStoryWithSteps(ds, project.id, {
        title: 'Passed Story',
      });
      const storyB = await seedStoryWithSteps(ds, project.id, {
        title: 'Available Story',
      });

      const { release, releaseStories } = await seedClosedRelease(
        ds,
        project.id,
        [storyA, storyB],
      );

      // Mark storyA as PASS
      const rsA = releaseStories.find((rs) => rs.sourceStoryId === storyA.id);
      await seedExecution(ds, release.id, rsA!.id, tester1.id, {
        status: TestStatus.PASS,
        completedAt: new Date(),
      });

      // Request work — should get storyB
      const rsB = releaseStories.find((rs) => rs.sourceStoryId === storyB.id);
      const assigned = await executionService.assignStory(
        release.id,
        tester2.id,
      );

      expect(assigned).not.toBeNull();
      expect(assigned!.releaseStory.id).toBe(rsB!.id);
    });
  });

  describe('cleanupTester', () => {
    it('should delete IN_PROGRESS execution and return story ID', async () => {
      const ds = getDataSource();
      await truncateAll(ds);

      const admin = await seedUser(ds);
      const tester = await seedUser(ds);
      const project = await seedProject(ds, admin.id);
      await seedProjectMember(ds, project.id, tester.id, UserRole.TESTER);

      const story = await seedStoryWithSteps(ds, project.id);
      const { release, releaseStories } = await seedClosedRelease(
        ds,
        project.id,
        [story],
      );

      await seedExecution(ds, release.id, releaseStories[0].id, tester.id, {
        status: TestStatus.IN_PROGRESS,
      });

      const unlockedId = await executionService.cleanupTester(
        release.id,
        tester.id,
      );

      expect(unlockedId).toBe(releaseStories[0].id);

      // Verify execution is deleted
      const remaining = await ds.getRepository(TestExecution).find({
        where: { releaseId: release.id },
      });
      expect(remaining).toHaveLength(0);
    });

    it('should return null if tester has no in-progress execution', async () => {
      const ds = getDataSource();
      await truncateAll(ds);

      const admin = await seedUser(ds);
      const tester = await seedUser(ds);
      const project = await seedProject(ds, admin.id);
      await seedProjectMember(ds, project.id, tester.id, UserRole.TESTER);

      const story = await seedStoryWithSteps(ds, project.id);
      const { release } = await seedClosedRelease(ds, project.id, [story]);

      const result = await executionService.cleanupTester(
        release.id,
        tester.id,
      );

      expect(result).toBeNull();
    });
  });

  describe('Attempt counting', () => {
    it('should increment attempt on re-assign after FAIL', async () => {
      const ds = getDataSource();
      await truncateAll(ds);

      const admin = await seedUser(ds);
      const tester1 = await seedUser(ds);
      const tester2 = await seedUser(ds);
      const project = await seedProject(ds, admin.id);
      await seedProjectMember(ds, project.id, tester1.id, UserRole.TESTER);
      await seedProjectMember(ds, project.id, tester2.id, UserRole.TESTER);

      const story = await seedStoryWithSteps(ds, project.id);
      const { release, releaseStories } = await seedClosedRelease(
        ds,
        project.id,
        [story],
      );

      // First tester fails
      await seedExecution(ds, release.id, releaseStories[0].id, tester1.id, {
        status: TestStatus.FAIL,
        attempt: 1,
        completedAt: new Date(),
      });

      // Second tester gets assigned — should be attempt 2
      const assigned = await executionService.assignStory(
        release.id,
        tester2.id,
      );

      expect(assigned).not.toBeNull();
      expect(assigned!.attempt).toBe(2);
    });
  });
});

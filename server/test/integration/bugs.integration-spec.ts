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
import { BugsService } from '../../src/bugs/bugs.service';
import { ReleaseStory } from '../../src/releases/entities/release-story.entity';
import {
  UserRole,
  TestStatus,
  BugSeverity,
  BugStatus,
} from '../../src/common/types/enums';

describe('Bugs Integration', () => {
  let app: INestApplication;
  let bugsService: BugsService;

  beforeAll(async () => {
    await initTestDataSource();
    await truncateAll();
    app = await createTestApp();
    bugsService = app.get(BugsService);
  });

  afterAll(async () => {
    await app.close();
    await closeTestDataSource();
  });

  describe('createFromExecution', () => {
    it('should create bug with correct fields from a failed execution', async () => {
      const ds = getDataSource();
      await truncateAll(ds);

      const admin = await seedUser(ds);
      const tester = await seedUser(ds);
      const project = await seedProject(ds, admin.id);
      await seedProjectMember(ds, project.id, tester.id, UserRole.TESTER);

      const story = await seedStoryWithSteps(ds, project.id, {
        title: 'Buggy Story',
      });
      const { release, releaseStories } = await seedClosedRelease(
        ds,
        project.id,
        [story],
      );

      const execution = await seedExecution(
        ds,
        release.id,
        releaseStories[0].id,
        tester.id,
        { status: TestStatus.FAIL, completedAt: new Date() },
      );

      const bug = await bugsService.createFromExecution(execution, tester.id, {
        title: 'Auto Bug',
        description: 'Created from failed execution',
        severity: BugSeverity.MAJOR,
      });

      expect(bug.title).toBe('Auto Bug');
      expect(bug.projectId).toBe(project.id);
      expect(bug.storyId).toBe(story.id);
      expect(bug.executionId).toBe(execution.id);
      expect(bug.reportedById).toBe(tester.id);
      expect(bug.status).toBe(BugStatus.OPEN);
      expect(bug.severity).toBe(BugSeverity.MAJOR);
    });

    it('should throw when source story has been deleted', async () => {
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

      // Set sourceStoryId to null (simulating source deletion)
      await ds
        .getRepository(ReleaseStory)
        .update(releaseStories[0].id, { sourceStoryId: null as never });

      const execution = await seedExecution(
        ds,
        release.id,
        releaseStories[0].id,
        tester.id,
        { status: TestStatus.FAIL, completedAt: new Date() },
      );

      await expect(
        bugsService.createFromExecution(execution, tester.id, {
          title: 'Orphan Bug',
          description: 'Source story deleted',
          severity: BugSeverity.MINOR,
        }),
      ).rejects.toThrow('source story has been deleted');
    });
  });

  describe('Assign to non-member', () => {
    it('should throw BadRequestException when assigning to non-member', async () => {
      const ds = getDataSource();
      await truncateAll(ds);

      const admin = await seedUser(ds);
      const outsider = await seedUser(ds);
      const project = await seedProject(ds, admin.id);

      const story = await seedStoryWithSteps(ds, project.id);

      // Create bug
      const bug = await bugsService.create(project.id, admin.id, {
        storyId: story.id,
        title: 'Assign Test',
        description: 'Testing assign validation',
        severity: BugSeverity.MINOR,
      });

      await expect(
        bugsService.update(bug.id, { assignedToId: outsider.id }),
      ).rejects.toThrow('not a member');
    });
  });
});

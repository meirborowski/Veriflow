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
  seedStoryWithSteps,
  seedClosedRelease,
} from '../helpers/seed.helper';
import { ReleasesService } from '../../src/releases/releases.service';
import { ReleaseStory } from '../../src/releases/entities/release-story.entity';
import { UserStory } from '../../src/user-stories/entities/user-story.entity';
import { Release } from '../../src/releases/entities/release.entity';
import { ReleaseStatus } from '../../src/common/types/enums';

describe('Releases Integration', () => {
  let app: INestApplication;
  let releasesService: ReleasesService;

  beforeAll(async () => {
    await initTestDataSource();
    await truncateAll();
    app = await createTestApp();
    releasesService = app.get(ReleasesService);
  });

  afterAll(async () => {
    await app.close();
    await closeTestDataSource();
  });

  describe('Snapshot immutability', () => {
    it('should not change snapshot when source story is modified after close', async () => {
      const ds = getDataSource();
      const user = await seedUser(ds);
      const project = await seedProject(ds, user.id);
      const story = await seedStoryWithSteps(ds, project.id, {
        title: 'Original Title',
        description: 'Original description',
        steps: [{ order: 1, instruction: 'Original step' }],
      });

      const { releaseStories } = await seedClosedRelease(ds, project.id, [
        story,
      ]);

      // Modify the source story
      await ds.getRepository(UserStory).update(story.id, {
        title: 'Modified Title',
      });

      // Reload snapshot — should still have original data
      const snapshot = await ds.getRepository(ReleaseStory).findOne({
        where: { id: releaseStories[0].id },
        relations: ['steps'],
      });

      expect(snapshot!.title).toBe('Original Title');
      expect(snapshot!.steps[0].instruction).toBe('Original step');
    });
  });

  describe('Snapshot completeness', () => {
    it('should copy all steps during close', async () => {
      const ds = getDataSource();
      await truncateAll(ds);

      const user = await seedUser(ds);
      const project = await seedProject(ds, user.id);
      const story = await seedStoryWithSteps(ds, project.id, {
        steps: [
          { order: 1, instruction: 'Step A' },
          { order: 2, instruction: 'Step B' },
          { order: 3, instruction: 'Step C' },
        ],
      });

      // Use the service to close (not the seed helper which creates directly)
      const releaseRepo = ds.getRepository(Release);
      const release = releaseRepo.create({
        projectId: project.id,
        name: 'Completeness Test',
        status: ReleaseStatus.DRAFT,
      });
      const savedRelease = await releaseRepo.save(release);

      // Add to scoped stories
      await ds.query(
        `INSERT INTO release_scoped_stories ("releaseId", "storyId") VALUES ($1, $2)`,
        [savedRelease.id, story.id],
      );

      await releasesService.close(savedRelease.id);

      const snapshots = await ds.getRepository(ReleaseStory).find({
        where: { releaseId: savedRelease.id },
        relations: ['steps'],
      });

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].steps).toHaveLength(3);
      expect(snapshots[0].steps.map((s) => s.instruction).sort()).toEqual(
        ['Step A', 'Step B', 'Step C'].sort(),
      );
    });
  });

  describe('Concurrent double-close', () => {
    it('should allow only one close to succeed', async () => {
      const ds = getDataSource();
      await truncateAll(ds);

      const user = await seedUser(ds);
      const project = await seedProject(ds, user.id);
      const story = await seedStoryWithSteps(ds, project.id);

      const releaseRepo = ds.getRepository(Release);
      const release = releaseRepo.create({
        projectId: project.id,
        name: 'Concurrent Close',
        status: ReleaseStatus.DRAFT,
      });
      const savedRelease = await releaseRepo.save(release);

      await ds.query(
        `INSERT INTO release_scoped_stories ("releaseId", "storyId") VALUES ($1, $2)`,
        [savedRelease.id, story.id],
      );

      const results = await Promise.allSettled([
        releasesService.close(savedRelease.id),
        releasesService.close(savedRelease.id),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      // Verify no duplicate snapshots
      const snapshots = await ds.getRepository(ReleaseStory).find({
        where: { releaseId: savedRelease.id },
      });
      expect(snapshots).toHaveLength(1);
    });
  });

  describe('Close with no stories', () => {
    it('should throw BadRequestException', async () => {
      const ds = getDataSource();
      await truncateAll(ds);

      const user = await seedUser(ds);
      const project = await seedProject(ds, user.id);

      const releaseRepo = ds.getRepository(Release);
      const release = releaseRepo.create({
        projectId: project.id,
        name: 'Empty Release',
        status: ReleaseStatus.DRAFT,
      });
      const savedRelease = await releaseRepo.save(release);

      await expect(releasesService.close(savedRelease.id)).rejects.toThrow(
        'Cannot close release with no stories',
      );
    });
  });
});

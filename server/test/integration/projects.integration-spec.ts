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
} from '../helpers/seed.helper';
import { ProjectsService } from '../../src/projects/projects.service';
import { ProjectMember } from '../../src/projects/entities/project-member.entity';
import { UserStory } from '../../src/user-stories/entities/user-story.entity';
import { Release } from '../../src/releases/entities/release.entity';
import { Bug } from '../../src/bugs/entities/bug.entity';
import { User } from '../../src/auth/entities/user.entity';
import { UserRole, BugSeverity, BugStatus } from '../../src/common/types/enums';

describe('Projects Integration', () => {
  let app: INestApplication;
  let projectsService: ProjectsService;

  beforeAll(async () => {
    await initTestDataSource();
    await truncateAll();
    app = await createTestApp();
    projectsService = app.get(ProjectsService);
  });

  afterAll(async () => {
    await app.close();
    await closeTestDataSource();
  });

  describe('Cascade delete', () => {
    it('should delete members, stories, releases, bugs when project is deleted', async () => {
      const ds = getDataSource();
      await truncateAll(ds);

      const admin = await seedUser(ds);
      const tester = await seedUser(ds);
      const project = await seedProject(ds, admin.id);
      await seedProjectMember(ds, project.id, tester.id, UserRole.TESTER);

      const story = await seedStoryWithSteps(ds, project.id);
      await seedClosedRelease(ds, project.id, [story]);

      // Create a bug
      const bugRepo = ds.getRepository(Bug);
      const bug = bugRepo.create({
        projectId: project.id,
        storyId: story.id,
        title: 'Test Bug',
        description: 'Will be cascaded',
        severity: BugSeverity.MINOR,
        status: BugStatus.OPEN,
        reportedById: admin.id,
      });
      await bugRepo.save(bug);

      // Delete project via service
      await projectsService.remove(project.id);

      // Verify cascade
      const members = await ds
        .getRepository(ProjectMember)
        .find({ where: { projectId: project.id } });
      expect(members).toHaveLength(0);

      const stories = await ds
        .getRepository(UserStory)
        .find({ where: { projectId: project.id } });
      expect(stories).toHaveLength(0);

      const releases = await ds
        .getRepository(Release)
        .find({ where: { projectId: project.id } });
      expect(releases).toHaveLength(0);

      const bugs = await ds
        .getRepository(Bug)
        .find({ where: { projectId: project.id } });
      expect(bugs).toHaveLength(0);

      // Users should NOT be deleted
      const adminUser = await ds
        .getRepository(User)
        .findOneBy({ id: admin.id });
      expect(adminUser).not.toBeNull();

      const testerUser = await ds
        .getRepository(User)
        .findOneBy({ id: tester.id });
      expect(testerUser).not.toBeNull();
    });
  });

  describe('Last admin protection', () => {
    it('should prevent removing the last admin via service', async () => {
      const ds = getDataSource();
      await truncateAll(ds);

      const admin = await seedUser(ds);
      const project = await seedProject(ds, admin.id);

      await expect(
        projectsService.removeMember(project.id, admin.id),
      ).rejects.toThrow('Cannot remove the last admin');
    });
  });
});

import { INestApplication } from '@nestjs/common';
import { io, Socket as ClientSocket } from 'socket.io-client';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/app.helper';
import {
  truncateAll,
  initTestDataSource,
  closeTestDataSource,
} from '../helpers/db.helper';
import { registerUser } from '../helpers/auth.helper';
import {
  createProject,
  addProjectMember,
  createStory,
  createRelease,
  addStoriesToRelease,
  closeRelease,
} from '../helpers/seed.helper';
import { TestExecution } from '../../src/test-execution/entities/test-execution.entity';
import { TestStatus } from '../../src/common/types/enums';

function createClient(port: number, token: string): ClientSocket {
  return io(`http://localhost:${port}/test-runner`, {
    auth: { token },
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
  });
}

function waitForConnect(client: ClientSocket, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (client.connected) {
      resolve();
      return;
    }
    const timer = setTimeout(
      () => reject(new Error('Connection timeout')),
      timeout,
    );
    client.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    client.once('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function waitForDisconnect(
  client: ClientSocket,
  timeout = 5000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (client.disconnected) {
      resolve();
      return;
    }
    const timer = setTimeout(
      () => reject(new Error('Disconnect timeout')),
      timeout,
    );
    client.once('disconnect', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function waitForEvent<T>(
  client: ClientSocket,
  event: string,
  timeout = 5000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for event: ${event}`)),
      timeout,
    );
    client.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

describe('WebSocket (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let port: number;

  beforeAll(async () => {
    ds = await initTestDataSource();
    await truncateAll();
    app = await createTestApp();
    await app.listen(0);
    const url = await app.getUrl();
    port = parseInt(new URL(url).port, 10);
  });

  afterAll(async () => {
    await app.close();
    await closeTestDataSource();
  });

  describe('Authentication', () => {
    it('should connect with valid JWT', async () => {
      const user = await registerUser(app);
      const client = createClient(port, user.accessToken);

      await waitForConnect(client);
      expect(client.connected).toBe(true);

      client.disconnect();
    });

    it('should disconnect client with no token', async () => {
      const client = createClient(port, '');

      // Server connects then immediately disconnects bad clients
      await waitForConnect(client);
      await waitForDisconnect(client);

      expect(client.disconnected).toBe(true);
      client.disconnect();
    });

    it('should disconnect client with invalid token', async () => {
      const client = createClient(port, 'invalid-jwt-token');

      await waitForConnect(client);
      await waitForDisconnect(client);

      expect(client.disconnected).toBe(true);
      client.disconnect();
    });
  });

  describe('join-session', () => {
    it('should join a release session and emit tester-joined', async () => {
      const admin = await registerUser(app);
      const tester = await registerUser(app);
      const project = await createProject(app, admin.authHeader);
      await addProjectMember(
        app,
        admin.authHeader,
        project.id,
        tester.email,
        'TESTER' as never,
      );

      const story = await createStory(app, admin.authHeader, project.id);
      const release = await createRelease(app, admin.authHeader, project.id);
      await addStoriesToRelease(app, admin.authHeader, release.id, [story.id]);
      const closed = await closeRelease(app, admin.authHeader, release.id);

      const client = createClient(port, tester.accessToken);
      await waitForConnect(client);

      // Set up listener BEFORE emitting
      const joinPromise = waitForEvent<{ userId: string }>(
        client,
        'tester-joined',
      );
      client.emit('join-session', { releaseId: closed.id });

      const data = await joinPromise;
      expect(data.userId).toBe(tester.id);

      client.disconnect();
    });

    it('should emit error for non-member', async () => {
      const admin = await registerUser(app);
      const outsider = await registerUser(app);
      const project = await createProject(app, admin.authHeader);
      const story = await createStory(app, admin.authHeader, project.id);
      const release = await createRelease(app, admin.authHeader, project.id);
      await addStoriesToRelease(app, admin.authHeader, release.id, [story.id]);
      const closed = await closeRelease(app, admin.authHeader, release.id);

      const client = createClient(port, outsider.accessToken);
      await waitForConnect(client);

      const errorPromise = waitForEvent<{ message: string }>(client, 'error');
      client.emit('join-session', { releaseId: closed.id });

      const data = await errorPromise;
      expect(data.message).toContain('Not a member');

      client.disconnect();
    });
  });

  describe('request-work', () => {
    it('should assign a story when pool is available', async () => {
      const admin = await registerUser(app);
      const tester = await registerUser(app);
      const project = await createProject(app, admin.authHeader);
      await addProjectMember(
        app,
        admin.authHeader,
        project.id,
        tester.email,
        'TESTER' as never,
      );

      const story = await createStory(app, admin.authHeader, project.id, {
        title: 'WS Story',
        steps: [{ order: 1, instruction: 'WS Step' }],
      });
      const release = await createRelease(app, admin.authHeader, project.id);
      await addStoriesToRelease(app, admin.authHeader, release.id, [story.id]);
      const closed = await closeRelease(app, admin.authHeader, release.id);

      const client = createClient(port, tester.accessToken);
      await waitForConnect(client);

      // Join session first
      const joinPromise = waitForEvent(client, 'tester-joined');
      client.emit('join-session', { releaseId: closed.id });
      await joinPromise;

      // Now request work
      const assignedPromise = waitForEvent<{
        executionId: string;
        releaseStory: { id: string; title: string };
        attempt: number;
      }>(client, 'story-assigned');

      client.emit('request-work', { releaseId: closed.id });

      const assigned = await assignedPromise;
      expect(assigned.executionId).toBeDefined();
      expect(assigned.releaseStory.title).toBe('WS Story');
      expect(assigned.attempt).toBe(1);

      client.disconnect();
    });

    it('should emit pool-empty when no stories available', async () => {
      const admin = await registerUser(app);
      const tester1 = await registerUser(app);
      const tester2 = await registerUser(app);
      const project = await createProject(app, admin.authHeader);
      await addProjectMember(
        app,
        admin.authHeader,
        project.id,
        tester1.email,
        'TESTER' as never,
      );
      await addProjectMember(
        app,
        admin.authHeader,
        project.id,
        tester2.email,
        'TESTER' as never,
      );

      const story = await createStory(app, admin.authHeader, project.id);
      const release = await createRelease(app, admin.authHeader, project.id);
      await addStoriesToRelease(app, admin.authHeader, release.id, [story.id]);
      const closed = await closeRelease(app, admin.authHeader, release.id);

      // First tester takes the only story
      const client1 = createClient(port, tester1.accessToken);
      await waitForConnect(client1);

      const join1 = waitForEvent(client1, 'tester-joined');
      client1.emit('join-session', { releaseId: closed.id });
      await join1;

      const assigned1 = waitForEvent(client1, 'story-assigned');
      client1.emit('request-work', { releaseId: closed.id });
      await assigned1;

      // Second tester should get pool-empty
      const client2 = createClient(port, tester2.accessToken);
      await waitForConnect(client2);

      const join2 = waitForEvent(client2, 'tester-joined');
      client2.emit('join-session', { releaseId: closed.id });
      await join2;

      const poolPromise = waitForEvent(client2, 'pool-empty');
      client2.emit('request-work', { releaseId: closed.id });
      await poolPromise;

      client1.disconnect();
      client2.disconnect();
    });
  });

  describe('submit-result', () => {
    it('should submit PASS result', async () => {
      const admin = await registerUser(app);
      const tester = await registerUser(app);
      const project = await createProject(app, admin.authHeader);
      await addProjectMember(
        app,
        admin.authHeader,
        project.id,
        tester.email,
        'TESTER' as never,
      );

      const story = await createStory(app, admin.authHeader, project.id);
      const release = await createRelease(app, admin.authHeader, project.id);
      await addStoriesToRelease(app, admin.authHeader, release.id, [story.id]);
      const closed = await closeRelease(app, admin.authHeader, release.id);

      const client = createClient(port, tester.accessToken);
      await waitForConnect(client);

      const joinPromise = waitForEvent(client, 'tester-joined');
      client.emit('join-session', { releaseId: closed.id });
      await joinPromise;

      const assigned = await new Promise<{
        executionId: string;
        releaseStory: { id: string };
      }>((resolve) => {
        client.once('story-assigned', resolve);
        client.emit('request-work', { releaseId: closed.id });
      });

      const resultPromise = waitForEvent<{
        executionId: string;
        status: string;
      }>(client, 'result-submitted');

      client.emit('submit-result', {
        executionId: assigned.executionId,
        status: 'PASS',
        comment: 'All good',
      });

      const result = await resultPromise;
      expect(result.executionId).toBe(assigned.executionId);
      expect(result.status).toBe('PASS');

      client.disconnect();
    });
  });

  describe('disconnect', () => {
    it('should clean up IN_PROGRESS execution on disconnect', async () => {
      const admin = await registerUser(app);
      const tester = await registerUser(app);
      const project = await createProject(app, admin.authHeader);
      await addProjectMember(
        app,
        admin.authHeader,
        project.id,
        tester.email,
        'TESTER' as never,
      );

      const story = await createStory(app, admin.authHeader, project.id);
      const release = await createRelease(app, admin.authHeader, project.id);
      await addStoriesToRelease(app, admin.authHeader, release.id, [story.id]);
      const closed = await closeRelease(app, admin.authHeader, release.id);

      const client = createClient(port, tester.accessToken);
      await waitForConnect(client);

      const joinPromise = waitForEvent(client, 'tester-joined');
      client.emit('join-session', { releaseId: closed.id });
      await joinPromise;

      await new Promise<void>((resolve) => {
        client.once('story-assigned', () => resolve());
        client.emit('request-work', { releaseId: closed.id });
      });

      // Verify there's an IN_PROGRESS execution
      const before = await ds.getRepository(TestExecution).find({
        where: { releaseId: closed.id, status: TestStatus.IN_PROGRESS },
      });
      expect(before).toHaveLength(1);

      // Disconnect
      client.disconnect();

      // Wait for server-side cleanup
      await new Promise((r) => setTimeout(r, 500));

      // IN_PROGRESS execution should be deleted
      const after = await ds.getRepository(TestExecution).find({
        where: { releaseId: closed.id, status: TestStatus.IN_PROGRESS },
      });
      expect(after).toHaveLength(0);
    });
  });
});

const DEFAULT_DATABASE_URL =
  'postgresql://testsync:testsync_dev@localhost:5432/testsync';

/**
 * Resolve the base database URL, normalising the Docker 'db' hostname
 * to 'localhost' so tests work outside the container.
 *
 * Safety: refuses to run against non-local databases unless
 * ALLOW_REMOTE_TEST_DB=true is explicitly set.
 */
export function resolveBaseUrl(): URL {
  const baseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
  const url = new URL(baseUrl);

  // Docker Compose uses 'db' as hostname; tests run on the host
  if (url.hostname === 'db') {
    url.hostname = 'localhost';
  }

  // Safety guard: prevent accidental test runs against remote databases
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (!isLocal && process.env.ALLOW_REMOTE_TEST_DB !== 'true') {
    throw new Error(
      `Refusing to run tests against remote host "${url.hostname}". ` +
        'Set ALLOW_REMOTE_TEST_DB=true to override.',
    );
  }

  return url;
}

export function getTestDatabaseUrl(): string {
  const url = resolveBaseUrl();
  url.pathname = '/veriflow_test';
  return url.toString();
}

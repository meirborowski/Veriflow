import { Client } from 'pg';

function resolveBaseUrl(): URL {
  const baseUrl =
    process.env.DATABASE_URL ??
    'postgresql://testsync:testsync_dev@localhost:5432/testsync';

  const url = new URL(baseUrl);
  // Docker Compose uses 'db' as hostname; tests run on the host
  if (url.hostname === 'db') {
    url.hostname = 'localhost';
  }
  return url;
}

function getTestDatabaseUrl(): string {
  const url = resolveBaseUrl();
  url.pathname = '/veriflow_test';
  return url.toString();
}

export default async function globalSetup(): Promise<void> {
  const url = resolveBaseUrl();
  url.pathname = '/postgres';

  const client = new Client({ connectionString: url.toString() });
  await client.connect();

  const result = await client.query(
    `SELECT 1 FROM pg_database WHERE datname = 'veriflow_test'`,
  );

  if (result.rowCount === 0) {
    await client.query('CREATE DATABASE veriflow_test');
  }

  await client.end();

  process.env.DATABASE_URL = getTestDatabaseUrl();

  // Ensure JWT secrets are available for test app bootstrap
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-jwt-secret';
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
  }
}

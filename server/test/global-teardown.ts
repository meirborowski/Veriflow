import { Client } from 'pg';
import { resolveBaseUrl } from './test-db-url';

export default async function globalTeardown(): Promise<void> {
  if (process.env.DROP_TEST_DB !== 'true') {
    return;
  }

  const url = resolveBaseUrl();
  url.pathname = '/postgres';

  const client = new Client({ connectionString: url.toString() });
  await client.connect();

  await client.query('DROP DATABASE IF EXISTS veriflow_test WITH (FORCE)');

  await client.end();
}

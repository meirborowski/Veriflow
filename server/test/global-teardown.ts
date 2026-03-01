import { Client } from 'pg';

export default async function globalTeardown(): Promise<void> {
  if (process.env.DROP_TEST_DB !== 'true') {
    return;
  }

  const baseUrl =
    process.env.DATABASE_URL ??
    'postgresql://veriflow:veriflow_dev@localhost:5432/veriflow';

  const url = new URL(baseUrl);
  url.pathname = '/postgres';

  const client = new Client({ connectionString: url.toString() });
  await client.connect();

  await client.query('DROP DATABASE IF EXISTS veriflow_test WITH (FORCE)');

  await client.end();
}

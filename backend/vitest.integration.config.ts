import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__integration__/**/*.integration.test.ts'],
    globalSetup: ['src/__integration__/setup.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    pool: 'forks',
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-for-vitest',
      CRON_SECRET: 'test-cron-secret-for-vitest',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/alpha_groups_test',
    },
  },
});

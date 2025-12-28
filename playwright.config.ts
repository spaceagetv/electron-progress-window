import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './test/e2e',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Single worker = single Electron instance
  // Tests run sequentially but can create multiple ProgressItems within each test
  // to verify concurrent behavior in a single ProgressWindow
  workers: 1,
  // Global setup runs once before all workers start to build the library and playground
  globalSetup: require.resolve('./test/e2e/global-setup.ts'),
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'on-first-retry',
  },
})

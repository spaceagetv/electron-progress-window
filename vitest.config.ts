import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts'],
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        // Preload and renderer run in Electron/browser context, tested via E2E
        'src/ProgressWindow/preload.ts',
        'src/ProgressWindow/renderer.ts',
      ],
    },
  },
})

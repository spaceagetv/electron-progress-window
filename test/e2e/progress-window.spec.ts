import {
  test,
  expect,
  ElectronApplication,
  Page,
  Locator,
} from '@playwright/test'
import { _electron as electron } from 'playwright'
import * as path from 'path'

// Extend Window interface for TypeScript
declare global {
  interface Window {
    electronAPI: {
      sendTimerButtonClick: (payload: {
        identifier?: string
        title?: string
        time: number
        indeterminate?: boolean
        persist?: boolean
        description?: boolean
        descriptionText?: string
        enablePause?: boolean
        enableCancel?: boolean
        error?: boolean
        theme?: string
        cssCustom?: boolean
      }) => void
    }
  }
}

// Helper to wait for a specific number of windows
// Uses Playwright's polling mechanism to check window count
async function waitForWindowCount(
  electronApp: ElectronApplication,
  count: number,
  comparator: 'equal' | 'greaterThan' = 'equal'
) {
  await expect
    .poll(() => electronApp.windows().length, {
      timeout: 10000,
      intervals: [100, 250, 500],
    })
    [comparator === 'equal' ? 'toBe' : 'toBeGreaterThan'](count)
}

// Helper to generate unique test identifier
function generateTestId(testTitle: string): string {
  return `test-${testTitle}-${Date.now()}`
}

// Helper to get progress window (creates if doesn't exist)
async function getProgressWindow(
  electronApp: ElectronApplication,
  mainWindow: Page
): Promise<Page> {
  const windows = electronApp.windows()
  let progressWindow = windows.find((w) => w !== mainWindow)

  if (!progressWindow) {
    // No progress window exists yet, wait for one to be created
    await waitForWindowCount(electronApp, 1, 'greaterThan')
    progressWindow = electronApp.windows().find((w) => w !== mainWindow)
  }

  if (!progressWindow) {
    throw new Error('Failed to find or create progress window')
  }

  await progressWindow.waitForLoadState('domcontentloaded')
  return progressWindow
}

// Helper to get a specific progress item by its test identifier
// The testId needs to be encoded the same way the ProgressItem sanitizes it
function getProgressItemById(progressWindow: Page, testId: string): Locator {
  // Encode the testId to match what ProgressItem.sanitizeIdentifier() does
  let encoded = encodeURIComponent(testId)

  // If it doesn't start with a letter, the sanitizer prefixes with 'id-'
  if (!/^[a-zA-Z]/.test(encoded)) {
    encoded = 'id-' + encoded
  }

  return progressWindow.locator(`[data-testid="${encoded}"]`)
}

// Helper to create a progress item via IPC and return its locator
async function createProgressItem(
  mainWindow: Page,
  electronApp: ElectronApplication,
  testTitle: string,
  options: {
    time: number
    indeterminate?: boolean
    persist?: boolean
    description?: boolean
    descriptionText?: string
    enablePause?: boolean
    enableCancel?: boolean
    error?: boolean
    theme?: string
    cssCustom?: boolean
  }
): Promise<{
  progressWindow: Page
  progressItem: Locator
  testId: string
}> {
  const testId = generateTestId(testTitle)

  // Send IPC message to create progress item using the exposed electronAPI
  // Now we pass the identifier separately from the title
  await mainWindow.evaluate(
    ({ identifier, opts }) => {
      window.electronAPI.sendTimerButtonClick({
        identifier,
        title: opts.title,
        time: opts.time,
        indeterminate: opts.indeterminate ?? false,
        persist: opts.persist ?? false,
        description: opts.description ?? false,
        descriptionText: opts.descriptionText,
        enablePause: opts.enablePause ?? true,
        enableCancel: opts.enableCancel ?? true,
        error: opts.error ?? false,
        theme: opts.theme,
        cssCustom: opts.cssCustom ?? false,
      })
    },
    { identifier: testId, opts: { title: testTitle, ...options } }
  )

  const progressWindow = await getProgressWindow(electronApp, mainWindow)
  const progressItem = getProgressItemById(progressWindow, testId)

  // Wait for the progress item to appear
  await expect(progressItem).toBeVisible({ timeout: 5000 })

  return { progressWindow, progressItem, testId }
}

const PLAYGROUND_PATH = path.join(__dirname, '../../examples/playground')
const MAIN_JS_PATH = path.join(PLAYGROUND_PATH, 'dist/main/index.js')

let electronApp: ElectronApplication
let mainWindow: Page

test.beforeAll(async () => {
  // Launch Electron app once for all tests
  // Note: The library and playground are built in global-setup.ts before workers start
  const launchArgs = [MAIN_JS_PATH]

  // Add flags needed for CI environments (Linux/GitHub Actions)
  if (process.env.CI) {
    launchArgs.push(
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    )
  }

  electronApp = await electron.launch({
    args: launchArgs,
  })

  // Wait for the first window to open
  mainWindow = await electronApp.firstWindow()
  await mainWindow.waitForLoadState('domcontentloaded')
})

test.beforeEach(async () => {
  // Clean up any progress windows that were created during previous test
  // Keep only the main window
  if (electronApp) {
    const windows = electronApp.windows()
    for (const window of windows) {
      if (window !== mainWindow) {
        await window.close()
      }
    }
    // Wait for all progress windows to close
    if (windows.length > 1) {
      await waitForWindowCount(electronApp, 1)
    }
  }
})

test.afterAll(async () => {
  // Close the app after all tests complete
  if (electronApp) {
    await electronApp.close()
  }
})

test.describe('ProgressWindow E2E Tests', () => {
  // UI and configuration tests - these run sequentially but are quick
  test.describe('UI and Configuration Tests', () => {
    test('should load the main window with timer buttons', async () => {
      // Check that the main window has loaded with buttons
      const buttons = await mainWindow.locator('button.timer').all()
      expect(buttons.length).toBeGreaterThan(0)

      // Check for specific buttons using data attributes to avoid ambiguity
      await expect(
        mainWindow.locator('button.timer[data-time="3"]').first()
      ).toBeVisible()
      await expect(
        mainWindow.locator('button.timer[data-time="10"]').first()
      ).toBeVisible()
    })

    test('should create a progress window when clicking a timer button', async () => {
      // Get initial window count
      const initialWindows = electronApp.windows()
      expect(initialWindows.length).toBe(1)

      // Click the 3 seconds button
      await mainWindow.locator('button.timer[data-time="3"]').first().click()

      // Wait for a second window (the progress window) to appear
      await waitForWindowCount(electronApp, 1, 'greaterThan')

      // Verify we have 2 windows now
      const windows = electronApp.windows()
      expect(windows.length).toBe(2)
    })

    test('should show progress bar in progress window', async () => {
      const { progressItem } = await createProgressItem(
        mainWindow,
        electronApp,
        'show progress bar',
        { time: 3 }
      )

      // Check for progress item elements
      await expect(
        progressItem.locator('.progress-item-progress')
      ).toBeVisible()
    })

    test('should show description text when description option is enabled', async () => {
      const { progressItem } = await createProgressItem(
        mainWindow,
        electronApp,
        'show description',
        { time: 3, description: true }
      )

      // Check for detail/description text
      await expect(progressItem.locator('.progress-item-detail')).toBeVisible()
    })

    test('should create indeterminate progress bar', async () => {
      const { progressItem } = await createProgressItem(
        mainWindow,
        electronApp,
        'indeterminate progress',
        { time: 5, indeterminate: true }
      )

      // Check that the progress item has the indeterminate class
      await expect(progressItem).toHaveClass(/indeterminate/)
    })

    test('should support multiple progress items', async () => {
      // Create two progress items concurrently
      const item1Promise = createProgressItem(
        mainWindow,
        electronApp,
        'multi-item-1',
        { time: 10 }
      )

      const item2Promise = createProgressItem(
        mainWindow,
        electronApp,
        'multi-item-2',
        { time: 10, description: true }
      )

      const [{ progressWindow, progressItem: item1 }, { progressItem: item2 }] =
        await Promise.all([item1Promise, item2Promise])

      // Both items should be visible
      await expect(item1).toBeVisible()
      await expect(item2).toBeVisible()

      // Check that we have at least 2 progress items in the window
      const progressItems = await progressWindow.locator('.progress-item').all()
      expect(progressItems.length).toBeGreaterThanOrEqual(2)
    })

    test('should show pause button when pauseable is enabled', async () => {
      const { progressItem } = await createProgressItem(
        mainWindow,
        electronApp,
        'pauseable enabled',
        { time: 10, enablePause: true }
      )

      // Check for pause button
      await expect(progressItem.locator('.progress-item-pause')).toBeVisible()
    })

    test('should hide pause button when pauseable is disabled', async () => {
      const { progressItem } = await createProgressItem(
        mainWindow,
        electronApp,
        'pauseable disabled',
        { time: 10, enablePause: false }
      )

      // Pause button should not be visible
      await expect(
        progressItem.locator('.progress-item-pause')
      ).not.toBeVisible()
    })

    test('should show cancel button when cancellable is enabled', async () => {
      const { progressItem } = await createProgressItem(
        mainWindow,
        electronApp,
        'cancellable enabled',
        { time: 10, enableCancel: true }
      )

      // Check for cancel button
      await expect(progressItem.locator('.progress-item-cancel')).toBeVisible()
    })

    test('should hide cancel button when cancellable is disabled', async () => {
      const { progressItem } = await createProgressItem(
        mainWindow,
        electronApp,
        'cancellable disabled',
        { time: 10, enableCancel: false }
      )

      // Cancel button should not be visible
      await expect(
        progressItem.locator('.progress-item-cancel')
      ).not.toBeVisible()
    })

    test('should apply stripes theme', async () => {
      const { progressItem } = await createProgressItem(
        mainWindow,
        electronApp,
        'stripes theme',
        { time: 10, theme: 'stripes' }
      )

      // Check that progress item has stripes class
      await expect(progressItem).toHaveClass(/stripes/)
    })

    test('should apply custom CSS colors', async () => {
      const { progressItem } = await createProgressItem(
        mainWindow,
        electronApp,
        'custom CSS',
        { time: 10, cssCustom: true }
      )

      // Verify custom colors are applied by checking CSS variables
      const itemBackground = await progressItem.evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--item-background')
      )
      const textColor = await progressItem.evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--text-color')
      )

      // The custom colors should be applied
      expect(itemBackground.trim()).toBe('#4ecdc4')
      expect(textColor.trim()).toBe('#ffffff')
    })
  }) // End of UI and Configuration Tests

  // Timing and state tests - run sequentially
  test.describe('Timing and State Tests', () => {
    test('should auto-remove item when timer completes', async () => {
      // Create a short timer that will auto-remove
      const { progressItem } = await createProgressItem(
        mainWindow,
        electronApp,
        'auto-remove test',
        {
          time: 3,
        }
      )

      // Item should be visible initially
      await expect(progressItem).toBeVisible()

      // Item should be removed when timer completes (autoRemove is true by default)
      // Use toBeVisible with timeout instead of hard-coded delay
      // 7 seconds: 3s timer + 4s buffer for removal animation and CI slowness
      await expect(progressItem).not.toBeVisible({ timeout: 7000 })
    })

    test('should keep persistent progress items after completion', async () => {
      const { progressItem } = await createProgressItem(
        mainWindow,
        electronApp,
        'persistent item',
        { time: 5, persist: true }
      )

      // Wait for timer to complete and verify item is still visible (persistent)
      // Poll to wait for completion indicator (progress reaches 100%)
      await expect
        .poll(
          async () => {
            const progressValue = await progressItem.evaluate((el) =>
              getComputedStyle(el).getPropertyValue('--progress-value')
            )
            return parseFloat(progressValue)
          },
          { timeout: 7000 }
        )
        .toBeGreaterThanOrEqual(1)

      // Progress item should still be visible (not removed because persist: true)
      await expect(progressItem).toBeVisible()
    })

    test('should update progress value over time', async () => {
      const { progressItem } = await createProgressItem(
        mainWindow,
        electronApp,
        'progress update test',
        { time: 3 }
      )

      // Get initial progress value from CSS custom property
      const initialValue = await progressItem.evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--progress-value')
      )

      // Poll for progress value to change instead of using hard-coded delay
      await expect
        .poll(
          async () => {
            const currentValue = await progressItem.evaluate((el) =>
              getComputedStyle(el).getPropertyValue('--progress-value')
            )
            return parseFloat(currentValue)
          },
          { timeout: 5000, intervals: [100, 250] }
        )
        .toBeGreaterThan(parseFloat(initialValue))
    })

    test('should actually pause and resume progress', async () => {
      const { progressItem } = await createProgressItem(
        mainWindow,
        electronApp,
        'pause resume test',
        { time: 10 }
      )

      // Wait for progress to start by polling for non-zero progress
      await expect
        .poll(
          async () => {
            const value = await progressItem.evaluate((el) =>
              getComputedStyle(el).getPropertyValue('--progress-value')
            )
            return parseFloat(value)
          },
          { timeout: 2000 }
        )
        .toBeGreaterThan(0)

      // Click pause button
      await progressItem.locator('.progress-item-pause').click()

      // Wait for paused class to be applied
      await expect(progressItem).toHaveClass(/paused/, { timeout: 1000 })

      // Get the paused value
      const valueWhenPaused = await progressItem.evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--progress-value')
      )

      // Poll to verify progress stays the same while paused (check multiple times)
      await expect
        .poll(
          async () => {
            const currentValue = await progressItem.evaluate((el) =>
              getComputedStyle(el).getPropertyValue('--progress-value')
            )
            return currentValue
          },
          { timeout: 2000, intervals: [500, 500, 500] }
        )
        .toBe(valueWhenPaused)

      // Click resume (pause button again)
      await progressItem.locator('.progress-item-pause').click()

      // Poll for progress to resume and increase
      await expect
        .poll(
          async () => {
            const value = await progressItem.evaluate((el) =>
              getComputedStyle(el).getPropertyValue('--progress-value')
            )
            return parseFloat(value)
          },
          { timeout: 3000 }
        )
        .toBeGreaterThan(parseFloat(valueWhenPaused))
    })

    test('should actually cancel progress', async () => {
      const { progressItem } = await createProgressItem(
        mainWindow,
        electronApp,
        'cancel test',
        { time: 10 }
      )

      // Verify progress item is visible
      await expect(progressItem).toBeVisible()

      // Click cancel button
      await progressItem.locator('.progress-item-cancel').click()

      // Progress item should be removed (cancelled class or removed from DOM)
      await expect(progressItem).not.toBeVisible({ timeout: 2000 })
    })

    test('should display error state', async () => {
      const { progressItem } = await createProgressItem(
        mainWindow,
        electronApp,
        'error state test',
        { time: 5, error: true }
      )

      // Wait for error class to be applied (happens at 50% progress)
      await expect(progressItem).toHaveClass(/error/, { timeout: 5000 })
    })

    test('should handle multiple concurrent operations', async () => {
      // Create 3 different progress items simultaneously
      const item1Promise = createProgressItem(
        mainWindow,
        electronApp,
        'concurrent-1',
        { time: 5 }
      )

      const item2Promise = createProgressItem(
        mainWindow,
        electronApp,
        'concurrent-2',
        { time: 8, description: true }
      )

      const item3Promise = createProgressItem(
        mainWindow,
        electronApp,
        'concurrent-3',
        { time: 10, indeterminate: true }
      )

      const [
        { progressWindow, progressItem: item1 },
        { progressItem: item2 },
        { progressItem: item3 },
      ] = await Promise.all([item1Promise, item2Promise, item3Promise])

      // All items should be visible
      await expect(item1).toBeVisible()
      await expect(item2).toBeVisible()
      await expect(item3).toBeVisible()

      // Verify we have at least 3 progress items
      const allItems = await progressWindow.locator('.progress-item').all()
      expect(allItems.length).toBeGreaterThanOrEqual(3)

      // Test that we can interact with individual items
      await item1.locator('.progress-item-pause').click()
      await expect(item1).toHaveClass(/paused/)

      // Other items should not be paused
      await expect(item2).not.toHaveClass(/paused/)
      await expect(item3).not.toHaveClass(/paused/)

      // Cancel one item
      await item2.locator('.progress-item-cancel').click()
      await expect(item2).not.toBeVisible({ timeout: 2000 })

      // Other items should still be visible
      await expect(item1).toBeVisible()
      await expect(item3).toBeVisible()
    })
  }) // End of Timing and State Tests

  // Comprehensive concurrent behavior tests - these truly test multiple items at once
  test.describe('Concurrent Behavior - Stress Tests', () => {
    test('should display 5 progress items simultaneously with different configurations', async () => {
      // Create 5 items all at once with different configurations
      const items = await Promise.all([
        createProgressItem(mainWindow, electronApp, 'Fast Progress', {
          time: 3,
          description: true,
        }),
        createProgressItem(mainWindow, electronApp, 'Slow Progress', {
          time: 10,
          theme: 'stripes',
        }),
        createProgressItem(mainWindow, electronApp, 'Indeterminate Task', {
          time: 8,
          indeterminate: true,
        }),
        createProgressItem(mainWindow, electronApp, 'Non-pauseable Task', {
          time: 7,
          enablePause: false,
        }),
        createProgressItem(mainWindow, electronApp, 'Custom Styled', {
          time: 5,
          cssCustom: true,
          description: true,
        }),
      ])

      // All 5 items should be visible simultaneously
      for (const { progressItem } of items) {
        await expect(progressItem).toBeVisible()
      }
    })

    test('should handle 10 concurrent progress items', async () => {
      // Stress test with 10 items
      const itemPromises = Array.from({ length: 10 }, (_, i) =>
        createProgressItem(mainWindow, electronApp, `Task ${i + 1}`, {
          time: 5 + i,
          description: i % 2 === 0,
          indeterminate: i % 3 === 0,
          theme: i % 2 === 0 ? 'stripes' : 'none',
        })
      )

      const items = await Promise.all(itemPromises)

      // All 10 items should be visible
      for (const { progressItem } of items) {
        await expect(progressItem).toBeVisible()
      }
    })

    test('should allow independent control of multiple concurrent items', async () => {
      // Create 4 items with different characteristics
      const [item1, item2, item3, item4] = await Promise.all([
        createProgressItem(mainWindow, electronApp, 'Pauseable Task 1', {
          time: 10,
          enablePause: true,
        }),
        createProgressItem(mainWindow, electronApp, 'Pauseable Task 2', {
          time: 10,
          enablePause: true,
        }),
        createProgressItem(mainWindow, electronApp, 'Cancellable Task', {
          time: 10,
          enableCancel: true,
        }),
        createProgressItem(mainWindow, electronApp, 'Persistent Task', {
          time: 3,
          persist: true,
        }),
      ])

      // Pause first item
      await item1.progressItem.locator('.progress-item-pause').click()
      await expect(item1.progressItem).toHaveClass(/paused/)

      // Second item should still be running
      await expect(item2.progressItem).not.toHaveClass(/paused/)

      // Pause second item too
      await item2.progressItem.locator('.progress-item-pause').click()
      await expect(item2.progressItem).toHaveClass(/paused/)

      // Cancel third item
      await item3.progressItem.locator('.progress-item-cancel').click()
      await expect(item3.progressItem).not.toBeVisible({ timeout: 2000 })

      // Other items should still be visible
      await expect(item1.progressItem).toBeVisible()
      await expect(item2.progressItem).toBeVisible()
      await expect(item4.progressItem).toBeVisible()

      // Resume first item
      await item1.progressItem.locator('.progress-item-pause').click()
      await expect(item1.progressItem).not.toHaveClass(/paused/)

      // Second should still be paused
      await expect(item2.progressItem).toHaveClass(/paused/)
    })

    test('should handle mixed completion times with concurrent items', async () => {
      // Create items with staggered completion times
      const [fast, medium, slow] = await Promise.all([
        createProgressItem(mainWindow, electronApp, 'Fast (2s)', { time: 2 }),
        createProgressItem(mainWindow, electronApp, 'Medium (5s)', {
          time: 5,
          persist: true,
        }),
        createProgressItem(mainWindow, electronApp, 'Slow (8s)', {
          time: 8,
          persist: true,
        }),
      ])

      // All should start visible
      await expect(fast.progressItem).toBeVisible()
      await expect(medium.progressItem).toBeVisible()
      await expect(slow.progressItem).toBeVisible()

      // Wait for fast to complete (2s + buffer)
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Fast should be gone (autoRemove), others should remain
      await expect(fast.progressItem).not.toBeVisible()
      await expect(medium.progressItem).toBeVisible()
      await expect(slow.progressItem).toBeVisible()

      // Cancel remaining items to clean up
      await medium.progressItem.locator('.progress-item-cancel').click()
      await slow.progressItem.locator('.progress-item-cancel').click()
    })

    test('should update progress independently for concurrent items', async () => {
      // Create 3 items that should progress at different rates
      const [item1, item2, item3] = await Promise.all([
        createProgressItem(mainWindow, electronApp, 'Quick Progress', {
          time: 3,
        }),
        createProgressItem(mainWindow, electronApp, 'Medium Progress', {
          time: 6,
        }),
        createProgressItem(mainWindow, electronApp, 'Slow Progress', {
          time: 9,
        }),
      ])

      // Wait a bit for progress to start
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Get progress values
      const progress1 = await item1.progressItem.evaluate((el) =>
        parseFloat(getComputedStyle(el).getPropertyValue('--progress-value'))
      )
      const progress2 = await item2.progressItem.evaluate((el) =>
        parseFloat(getComputedStyle(el).getPropertyValue('--progress-value'))
      )
      const progress3 = await item3.progressItem.evaluate((el) =>
        parseFloat(getComputedStyle(el).getPropertyValue('--progress-value'))
      )

      // Quick should be furthest along
      expect(progress1).toBeGreaterThan(progress2)
      expect(progress2).toBeGreaterThan(progress3)

      // All should have made some progress
      expect(progress1).toBeGreaterThan(0)
      expect(progress2).toBeGreaterThan(0)
      expect(progress3).toBeGreaterThan(0)
    })
  }) // End of Concurrent Behavior Tests
}) // End of ProgressWindow E2E Tests

# E2E Test Parallelization Notes

## Current Architecture (as of Dec 2025)

### Identifier Feature

Tests now use a custom `identifier` property instead of modifying titles:

- **Before**: Tests created items with titles like `"Test: show progress bar - 1735408123456"`
- **After**: Tests use normal titles and pass a separate `identifier` parameter

Benefits:
- ✅ Cleaner, more realistic test titles
- ✅ Standard `data-testid` attribute for targeting elements
- ✅ Identifier also set as HTML `id` attribute
- ✅ Follows testing best practices (separation of test concerns from display)

Example:
```typescript
const { progressItem } = await createProgressItem(
  mainWindow,
  electronApp,
  'show progress bar',  // Normal human-readable title
  { time: 3 }
)
// Generates identifier: "test-show-progress-bar-1735408123456"
// Title displayed: "show progress bar"
// Element selector: [data-testid="test-show-progress-bar-1735408123456"]
```

## Architecture

### How It Works

1. **Global Setup** (`global-setup.ts`):
   - Runs ONCE before all workers start
   - Builds the main library and playground app
   - Prevents duplicate builds across workers

2. **Worker Setup** (`beforeAll` in spec file):
   - Runs ONCE per worker (1 worker = 1 Electron instance)
   - The single worker gets one isolated Electron app instance
   - Tests share the same Electron app instance

3. **Test Execution**:
   - **All Tests**: Run sequentially in a single worker
   - Tests use unique identifiers to avoid conflicts when creating progress items
   - Multiple progress items can exist simultaneously to test concurrent behavior
   - Clean-up between tests is handled by beforeEach (currently disabled for stress testing)

### Performance Results

- **Total Time**: ~32 seconds for 24 tests
- **Tests run sequentially** but complete quickly (most under 1 second)
- **Timing-dependent tests**: Use Playwright's polling mechanism instead of hard-coded delays
- **Concurrent behavior tests**: Create multiple progress items within a single test

### Worker vs Electron Instance Relationship

**Important**: This setup uses a single worker with a single Electron instance!

- **Workers**: Node.js processes that run tests (configured in playwright.config.ts)
- **Electron Instances**: The actual Electron apps being tested
- **Current Setup**: 1 worker, launching 1 Electron app = 1 total Electron instance

This is the CORRECT pattern for testing concurrent behavior because:
- ✅ All progress items run in the same ProgressWindow instance
- ✅ Tests true concurrent behavior (multiple items in same window)
- ✅ Unique identifiers prevent test interference
- ✅ Realistic simulation of real-world usage

### Why Tests Use Unique Identifiers

Even though tests run sequentially in a single worker, unique identifiers are still needed because:
- **Stress tests** intentionally create multiple progress items that persist across tests
- **beforeEach cleanup is currently disabled** to test true concurrent behavior
- **Multiple items accumulate** in the same ProgressWindow across tests
- **Unique identifiers** allow each test to target its specific item via `data-testid`

Without unique identifiers:
- Test A creates item titled "show progress bar"
- Test B creates item titled "show progress bar"
- Both items exist, selector `[title="show progress bar"]` matches 2 elements → test fails

With unique identifiers:
- Test A creates item with `testId="test-show-progress-bar-1703001234567"`
- Test B creates item with `testId="test-show-progress-bar-1703001235678"`
- Each test targets its own item via unique `data-testid` → tests pass

### Test Organization

All 24 tests run sequentially in a single worker, organized into 3 groups:

**UI and Configuration Tests** (12 tests - fast):
- Loading main window with buttons
- Creating progress windows
- Showing progress bars and descriptions
- UI element visibility (pause/cancel buttons, themes, custom CSS)
- Multiple progress items
- Indeterminate progress bars

**Timing and State Tests** (7 tests - moderate speed):
- Auto-removal when timer completes
- Persistent items that don't auto-remove
- Progress value updates over time (uses polling)
- Pause/resume functionality (uses polling)
- Cancel functionality
- Error state display (uses polling)
- Multiple concurrent operations

**Concurrent Behavior - Stress Tests** (5 tests - tests real concurrency):
- 5 items simultaneously with different configurations
- 10 concurrent progress items
- Independent control of multiple items (pause one, cancel another)
- Mixed completion times
- Independent progress updates

## Performance Optimizations Implemented

1. **Replaced setTimeout with expect.poll()**:
   - Tests now complete as soon as conditions are met
   - No more waiting for arbitrary delays
   - Faster and more reliable

2. **Proper use of Playwright assertions**:
   - Built-in retry logic with timeouts
   - Auto-waiting for elements
   - Cleaner test code

3. **Single worker for true concurrency testing**:
   - All tests share one Electron instance
   - Multiple progress items can coexist
   - Realistic real-world scenario

3. **Increase Workers** (if more parallel tests added):
   - Currently: 3 workers for 12 parallel tests = efficient
   - If we had 20+ parallel tests, could increase to 4-5 workers

## Conclusion

The current parallelization is **well-optimized** for this test suite:
- ✅ Parallel execution where safe (12 tests)
- ✅ Serial execution where necessary (6 timing tests)
- ✅ Proper isolation via multiple Electron instances
- ✅ Global setup prevents duplicate builds
- ✅ Clean architecture with clear separation

The 27-second runtime is dominated by serial tests that inherently need to wait for timers. This is much better than the original ~60+ seconds if all tests ran serially!

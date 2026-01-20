/**
 * Tests for Logger class
 */

import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'

describe('Logger', () => {
  let consoleSpy: {
    error: ReturnType<typeof vi.spyOn>
    warn: ReturnType<typeof vi.spyOn>
    info: ReturnType<typeof vi.spyOn>
    log: ReturnType<typeof vi.spyOn>
  }

  beforeEach(() => {
    // Reset modules to get a fresh Logger instance
    vi.resetModules()
    // Spy on console methods - using noop functions
    const noop = () => {
      /* intentionally empty */
    }
    consoleSpy = {
      error: vi.spyOn(console, 'error').mockImplementation(noop),
      warn: vi.spyOn(console, 'warn').mockImplementation(noop),
      info: vi.spyOn(console, 'info').mockImplementation(noop),
      log: vi.spyOn(console, 'log').mockImplementation(noop),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('singleton pattern', () => {
    it('should return same instance on multiple getInstance() calls', async () => {
      const { Logger } = await import('../../src/logger')
      const instance1 = Logger.getInstance()
      const instance2 = Logger.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('should initialize with SILENT level by default', async () => {
      const { Logger } = await import('../../src/logger')
      const logger = Logger.getInstance()

      // With SILENT level, nothing should be logged
      logger.error('test')
      logger.warn('test')
      logger.info('test')
      logger.debug('test')
      logger.silly('test')

      expect(consoleSpy.error).not.toHaveBeenCalled()
      expect(consoleSpy.warn).not.toHaveBeenCalled()
      expect(consoleSpy.info).not.toHaveBeenCalled()
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })
  })

  describe('setLevel', () => {
    it('should change the log level', async () => {
      const { Logger, LogLevel } = await import('../../src/logger')
      const logger = Logger.getInstance()

      // Initially SILENT - nothing logged
      logger.error('test1')
      expect(consoleSpy.error).not.toHaveBeenCalled()

      // Set to ERROR level
      logger.setLevel(LogLevel.ERROR)
      logger.error('test2')
      expect(consoleSpy.error).toHaveBeenCalledWith('test2')
    })
  })

  describe('log level filtering', () => {
    describe('error()', () => {
      it('should log when level >= ERROR', async () => {
        const { Logger, LogLevel } = await import('../../src/logger')
        const logger = Logger.getInstance()
        logger.setLevel(LogLevel.ERROR)

        logger.error('error message')
        expect(consoleSpy.error).toHaveBeenCalledWith('error message')
      })

      it('should not log when level is SILENT', async () => {
        const { Logger, LogLevel } = await import('../../src/logger')
        const logger = Logger.getInstance()
        logger.setLevel(LogLevel.SILENT)

        logger.error('error message')
        expect(consoleSpy.error).not.toHaveBeenCalled()
      })
    })

    describe('warn()', () => {
      it('should log when level >= WARN', async () => {
        const { Logger, LogLevel } = await import('../../src/logger')
        const logger = Logger.getInstance()
        logger.setLevel(LogLevel.WARN)

        logger.warn('warn message')
        expect(consoleSpy.warn).toHaveBeenCalledWith('warn message')
      })

      it('should not log when level < WARN', async () => {
        const { Logger, LogLevel } = await import('../../src/logger')
        const logger = Logger.getInstance()
        logger.setLevel(LogLevel.ERROR)

        logger.warn('warn message')
        expect(consoleSpy.warn).not.toHaveBeenCalled()
      })
    })

    describe('info()', () => {
      it('should log when level >= INFO', async () => {
        const { Logger, LogLevel } = await import('../../src/logger')
        const logger = Logger.getInstance()
        logger.setLevel(LogLevel.INFO)

        logger.info('info message')
        expect(consoleSpy.info).toHaveBeenCalledWith('info message')
      })

      it('should not log when level < INFO', async () => {
        const { Logger, LogLevel } = await import('../../src/logger')
        const logger = Logger.getInstance()
        logger.setLevel(LogLevel.WARN)

        logger.info('info message')
        expect(consoleSpy.info).not.toHaveBeenCalled()
      })
    })

    describe('log()', () => {
      it('should be an alias for info()', async () => {
        const { Logger, LogLevel } = await import('../../src/logger')
        const logger = Logger.getInstance()
        logger.setLevel(LogLevel.INFO)

        logger.log('log message')
        expect(consoleSpy.info).toHaveBeenCalledWith('log message')
      })
    })

    describe('debug()', () => {
      it('should log when level >= DEBUG', async () => {
        const { Logger, LogLevel } = await import('../../src/logger')
        const logger = Logger.getInstance()
        logger.setLevel(LogLevel.DEBUG)

        logger.debug('debug message')
        expect(consoleSpy.log).toHaveBeenCalledWith('debug message')
      })

      it('should not log when level < DEBUG', async () => {
        const { Logger, LogLevel } = await import('../../src/logger')
        const logger = Logger.getInstance()
        logger.setLevel(LogLevel.VERBOSE)

        logger.debug('debug message')
        expect(consoleSpy.log).not.toHaveBeenCalled()
      })
    })

    describe('silly()', () => {
      it('should log when level >= SILLY', async () => {
        const { Logger, LogLevel } = await import('../../src/logger')
        const logger = Logger.getInstance()
        logger.setLevel(LogLevel.SILLY)

        logger.silly('silly message')
        expect(consoleSpy.log).toHaveBeenCalledWith('silly message')
      })

      it('should not log when level < SILLY', async () => {
        const { Logger, LogLevel } = await import('../../src/logger')
        const logger = Logger.getInstance()
        logger.setLevel(LogLevel.DEBUG)

        logger.silly('silly message')
        expect(consoleSpy.log).not.toHaveBeenCalled()
      })
    })
  })

  describe('optionalParams', () => {
    it('should pass optional params to console methods', async () => {
      const { Logger, LogLevel } = await import('../../src/logger')
      const logger = Logger.getInstance()
      logger.setLevel(LogLevel.SILLY)

      const obj = { key: 'value' }
      const arr = [1, 2, 3]

      logger.error('error', obj, arr)
      expect(consoleSpy.error).toHaveBeenCalledWith('error', obj, arr)

      logger.warn('warn', obj, arr)
      expect(consoleSpy.warn).toHaveBeenCalledWith('warn', obj, arr)

      logger.info('info', obj, arr)
      expect(consoleSpy.info).toHaveBeenCalledWith('info', obj, arr)

      logger.debug('debug', obj, arr)
      expect(consoleSpy.log).toHaveBeenCalledWith('debug', obj, arr)

      logger.silly('silly', obj, arr)
      // silly was called second with console.log
      expect(consoleSpy.log).toHaveBeenCalledWith('silly', obj, arr)
    })
  })

  describe('environment variable', () => {
    it('should set level from ELECTRON_PROGRESS_WINDOW_LOG_LEVEL env var', async () => {
      // Set env var before importing
      vi.stubEnv('ELECTRON_PROGRESS_WINDOW_LOG_LEVEL', 'debug')
      vi.resetModules()

      const { Logger } = await import('../../src/logger')
      const logger = Logger.getInstance()

      // Should be at DEBUG level, so debug should log
      logger.debug('debug from env')
      expect(consoleSpy.log).toHaveBeenCalledWith('debug from env')

      // Clean up
      vi.unstubAllEnvs()
    })

    it('should handle all valid log level names from env var', async () => {
      const levels = ['error', 'warn', 'info', 'verbose', 'debug', 'silly']

      for (const level of levels) {
        vi.stubEnv('ELECTRON_PROGRESS_WINDOW_LOG_LEVEL', level)
        vi.resetModules()

        // Clear all spies for fresh check
        consoleSpy.error.mockClear()
        consoleSpy.warn.mockClear()
        consoleSpy.info.mockClear()
        consoleSpy.log.mockClear()

        const { Logger, LogLevel } = await import('../../src/logger')
        const logger = Logger.getInstance()

        // Set to max level to test
        logger.setLevel(LogLevel.SILLY)

        // All methods should work
        logger.error('test')
        logger.warn('test')
        logger.info('test')
        logger.debug('test')
        logger.silly('test')

        vi.unstubAllEnvs()
      }
    })
  })

  describe('exported logger instance', () => {
    it('should export a pre-created logger instance', async () => {
      const { logger, Logger } = await import('../../src/logger')
      expect(logger).toBe(Logger.getInstance())
    })
  })
})

/**
 * Tests for ProgressItem.ts
 */

import { vi } from 'vitest'
import { ProgressItem } from '../../src/index'
import { pause } from './pause'

describe('ProgressItem', () => {
  describe('event emitters', () => {
    it('should emit a "update" event on update()', () => {
      const updateSpy = vi.fn()
      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.update({ value: 0.1 })

      expect(updateSpy).toHaveBeenCalledTimes(1)
    })

    it('should emit a "update" event on assignment of "value"', () => {
      const updateSpy = vi.fn()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.value = 0.1

      expect(updateSpy).toHaveBeenCalledTimes(1)
    })

    it('should emit a "update" event on assignment of "maxValue"', () => {
      const updateSpy = vi.fn()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.maxValue = 0.1

      expect(updateSpy).toHaveBeenCalledTimes(1)
    })

    it('should emit a "update" event on assignment of "title"', () => {
      const updateSpy = vi.fn()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.title = 'test'

      expect(updateSpy).toHaveBeenCalledTimes(1)
      expect(progressItem.title).toBe('test')
    })

    it('should emit a "update" event on assignment of "detail"', () => {
      const updateSpy = vi.fn()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.detail = 'test'

      expect(updateSpy).toHaveBeenCalledTimes(1)
      expect(progressItem.detail).toBe('test')
    })

    it('should emit a "update" event on assignment of "css"', () => {
      const updateSpy = vi.fn()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.cssVars = {
        errorBackground: 'red',
      }

      expect(updateSpy).toHaveBeenCalledTimes(1)
      expect(progressItem.cssVars).toEqual({
        errorBackground: 'red',
      })
      expect(progressItem.cssTransferable).toEqual([
        ['--error-background', 'red'],
      ])
    })

    it('should emit a "update" event on assignment of "theme"', () => {
      const updateSpy = vi.fn()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.theme = 'none'

      expect(updateSpy).toHaveBeenCalledTimes(1)
      expect(progressItem.theme).toBe('none')
    })

    it('should emit a "update" event on assignment of "indeterminate"', () => {
      const updateSpy = vi.fn()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.indeterminate = true

      expect(updateSpy).toHaveBeenCalledTimes(1)
    })

    it('should emit a "update" event on assignment of "cancellable"', () => {
      const updateSpy = vi.fn()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.cancellable = false

      expect(updateSpy).toHaveBeenCalledTimes(1)
      expect(progressItem.cancellable).toBe(false)
    })

    it('should emit a "update" event on assignment of "pauseable"', () => {
      const updateSpy = vi.fn()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.pauseable = true

      expect(updateSpy).toHaveBeenCalledTimes(1)
      expect(progressItem.pauseable).toBe(true)
    })

    it('should emit a "update" event on assignment of "error"', () => {
      const updateSpy = vi.fn()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.error = true

      expect(updateSpy).toHaveBeenCalledTimes(1)
      expect(progressItem.error).toBe(true)
    })

    it('should emit a "update" event on assignment of "completeAutomatically"', () => {
      const updateSpy = vi.fn()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.completeAutomatically = false

      expect(updateSpy).toHaveBeenCalledTimes(1)
      expect(progressItem.completeAutomatically).toBe(false)
    })

    it('should emit a "update" event on assignment of "autoRemove"', () => {
      const updateSpy = vi.fn()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.autoRemove = false

      expect(updateSpy).toHaveBeenCalledTimes(1)
      expect(progressItem.autoRemove).toBe(false)
    })

    it('should NOT emit a "update" event on assignment of current options', () => {
      const updateSpy = vi.fn()

      const progressItem = new ProgressItem({
        value: 0.1,
        maxValue: 0.1,
        title: 'test',
        detail: 'test',
        cssVars: {
          errorBackground: 'red',
        },
        theme: 'none',
        indeterminate: true,
        cancellable: false,
        pauseable: true,
        error: true,
        completeAutomatically: false,
        autoRemove: false,
      })

      progressItem.on('update', updateSpy)

      progressItem.value = 0.1
      progressItem.maxValue = 0.1
      progressItem.title = 'test'
      progressItem.detail = 'test'
      progressItem.cssVars = {
        errorBackground: 'red',
      }
      progressItem.theme = 'none'
      progressItem.indeterminate = true
      progressItem.cancellable = false
      progressItem.pauseable = true
      progressItem.error = true
      progressItem.completeAutomatically = false
      progressItem.autoRemove = false

      expect(updateSpy).not.toHaveBeenCalled()
    })

    // paused event
    it('should emit a "paused" event when paused', () => {
      const pauseSpy = vi.fn()
      const progressItem = new ProgressItem()
      progressItem.on('paused', pauseSpy)

      progressItem.paused = true

      expect(pauseSpy).toHaveBeenCalledTimes(1)
      expect(pauseSpy).toHaveBeenCalledWith(true)

      progressItem.paused = false
      expect(pauseSpy).toHaveBeenCalledTimes(2)
      expect(pauseSpy).toHaveBeenCalledWith(false)
    })

    // willCancel event
    it('should emit a "willCancel" event when cancelled', () => {
      const willCancelSpy = vi.fn()
      const progressItem = new ProgressItem()
      progressItem.on('willCancel', willCancelSpy)

      progressItem.cancel()

      expect(willCancelSpy).toHaveBeenCalledTimes(1)
    })

    // willCancel with preventDefault
    it('should not emit a "cancelled" event when cancelled with preventDefault', () => {
      const cancelledSpy = vi.fn()
      const progressItem = new ProgressItem()
      progressItem.on('cancelled', cancelledSpy)
      progressItem.on('willCancel', (e) => e.preventDefault())

      progressItem.cancel()

      expect(cancelledSpy).not.toHaveBeenCalled()
    })

    // cancelled event
    it('should emit a "cancelled" event when cancelled', () => {
      const cancelledSpy = vi.fn()
      const progressItem = new ProgressItem()
      progressItem.on('cancelled', cancelledSpy)

      progressItem.cancel()

      expect(cancelledSpy).toHaveBeenCalledTimes(1)
    })

    // remove event
    it('should emit a "remove" event when removed', () => {
      const removeSpy = vi.fn()
      const progressItem = new ProgressItem()
      progressItem.on('remove', removeSpy)

      progressItem.remove()

      expect(removeSpy).toHaveBeenCalledTimes(1)
    })

    // complete event
    it('should emit a "complete" event when completed', () => {
      const completeSpy = vi.fn()
      const progressItem = new ProgressItem()
      progressItem.on('complete', completeSpy)

      progressItem.complete()

      expect(completeSpy).toHaveBeenCalledTimes(1)
    })

    // emit complete event when progress is 100
    it('should emit a "complete" event when progress is 100', () => {
      const completeSpy = vi.fn()
      const progressItem = new ProgressItem()
      progressItem.on('complete', completeSpy)

      progressItem.value = 100

      expect(completeSpy).toHaveBeenCalledTimes(1)
    })

    describe('show/hide', () => {
      it('should emit "show" when initiallyVisible is true', async () => {
        const showSpy = vi.fn()
        const progressItem = new ProgressItem()
        progressItem.on('show', showSpy)

        // wait for events to fire
        await pause(20)

        expect(showSpy).toHaveBeenCalledTimes(1)
        expect(progressItem.visible).toBe(true)
      })

      it('should not emit "show" immediately if initiallyVisible is false', async () => {
        const showSpy = vi.fn()
        const progressItem = new ProgressItem({
          initiallyVisible: false,
        })
        progressItem.on('show', showSpy)

        // wait for events to fire
        await pause(1)

        expect(showSpy).not.toHaveBeenCalled()
        expect(progressItem.visible).toBe(false)
      })

      it('should emit "show" when show() is called', async () => {
        const showSpy = vi.fn()
        const progressItem = new ProgressItem({
          initiallyVisible: false,
        })
        progressItem.on('show', showSpy)

        await pause(1)

        expect(progressItem.visible).toBe(false)
        expect(showSpy).not.toHaveBeenCalled()

        progressItem.show()

        // wait for events to fire
        await pause(1)

        expect(progressItem.visible).toBe(true)
        expect(showSpy).toHaveBeenCalledTimes(1)
      })

      it('should emit "hide" when hide() is called', async () => {
        const hideSpy = vi.fn()
        const progressItem = new ProgressItem()
        progressItem.on('hide', hideSpy)

        await pause(10)

        expect(progressItem.visible).toBe(true)
        expect(hideSpy).not.toHaveBeenCalled()

        progressItem.hide()

        // wait for events to fire
        await pause(1)

        expect(hideSpy).toHaveBeenCalledTimes(1)
        expect(progressItem.visible).toBe(false)
      })

      it('should emit "show" after a delay when delayIndeterminateMs has value', async () => {
        const showSpy = vi.fn()
        const progressItem = new ProgressItem({
          indeterminate: true,
          delayIndeterminateMs: 100,
        })
        progressItem.on('show', showSpy)

        // wait for events to fire
        await pause(1)

        expect(progressItem.visible).toBe(false)
        expect(showSpy).not.toHaveBeenCalled()

        // wait for delayIndeterminateMs
        await pause(150)

        expect(progressItem.visible).toBe(true)
        expect(showSpy).toHaveBeenCalledTimes(1)
      })

      it('should emit "show" immediately when delayIndeterminateMs is 0', async () => {
        const showSpy = vi.fn()
        const progressItem = new ProgressItem({
          indeterminate: true,
          delayIndeterminateMs: 0,
        })
        progressItem.on('show', showSpy)

        // wait for setImmediate to fire
        await pause(20)

        expect(progressItem.visible).toBe(true)
        expect(showSpy).toHaveBeenCalledTimes(1)
      })

      it('should emit "show" immediately when delayIndeterminateMs is negative', async () => {
        const showSpy = vi.fn()
        const progressItem = new ProgressItem({
          indeterminate: true,
          delayIndeterminateMs: -100,
        })
        progressItem.on('show', showSpy)

        // wait for events to fire
        await pause(20)

        expect(progressItem.visible).toBe(true)
        expect(showSpy).toHaveBeenCalledTimes(1)
      })

      it('should emit "show" immediately when delayIndeterminateMs is undefined', async () => {
        const showSpy = vi.fn()
        const progressItem = new ProgressItem({
          indeterminate: true,
          delayIndeterminateMs: undefined,
        })
        progressItem.on('show', showSpy)

        // wait for events to fire
        await pause(20)

        expect(progressItem.visible).toBe(true)
        expect(showSpy).toHaveBeenCalledTimes(1)
      })

      it('should emit "show" after a delay when showWhenEstimateExceedsMs has value', async () => {
        const showSpy = vi.fn()
        const progressItem = new ProgressItem({
          showWhenEstimateExceedsMs: 200,
        })
        progressItem.on('show', showSpy)

        // wait for events to fire
        await pause(1)

        expect(progressItem.visible).toBe(false)
        expect(showSpy).not.toHaveBeenCalled()
        expect(progressItem.getEstimatedTotalTime()).toBeUndefined()

        // wait for showWhenEstimateExceedsMs
        await pause(100)
        progressItem.value = 49
        expect(progressItem.getEstimatedTotalTime()).toBeGreaterThan(200)
        await pause(1)

        expect(showSpy).toHaveBeenCalledTimes(1)
        expect(progressItem.visible).toBe(true)
      })

      it('should not emit "show" when estimated time exceeds showWhenEstimateExceedsMs', async () => {
        const showSpy = vi.fn()
        const progressItem = new ProgressItem({
          showWhenEstimateExceedsMs: 2000,
        })
        progressItem.on('show', showSpy)

        // wait for events to fire
        await pause(1)

        expect(progressItem.visible).toBe(false)
        expect(showSpy).not.toHaveBeenCalled()
        expect(progressItem.getEstimatedTotalTime()).toBeUndefined()

        // wait for showWhenEstimateExceedsMs
        await pause(100)
        progressItem.value = 49
        expect(progressItem.getEstimatedTotalTime()).toBeLessThan(2000)
        await pause(1)

        expect(showSpy).not.toHaveBeenCalled()
        expect(progressItem.visible).toBe(false)
      })

      it('should emit "show" immediately when showWhenEstimateExceedsMs is 0', async () => {
        const showSpy = vi.fn()
        const progressItem = new ProgressItem({
          showWhenEstimateExceedsMs: 0,
        })
        progressItem.on('show', showSpy)

        // wait for events to fire
        await pause(10)

        expect(progressItem.visible).toBe(true)
        expect(showSpy).toHaveBeenCalledTimes(1)
      })

      it('should emit "show" immediately when showWhenEstimateExceedsMs is negative', async () => {
        const showSpy = vi.fn()
        const progressItem = new ProgressItem({
          showWhenEstimateExceedsMs: -100,
        })
        progressItem.on('show', showSpy)

        // wait for events to fire
        await pause(10)

        expect(progressItem.visible).toBe(true)
        expect(showSpy).toHaveBeenCalledTimes(1)
      })

      it('should emit "show" immediately when showWhenEstimateExceedsMs is undefined', async () => {
        const showSpy = vi.fn()
        const progressItem = new ProgressItem({
          showWhenEstimateExceedsMs: undefined,
        })
        progressItem.on('show', showSpy)

        // wait for events to fire
        await pause(10)

        expect(progressItem.visible).toBe(true)
        expect(showSpy).toHaveBeenCalledTimes(1)
      })

      it('should cancel delayIndeterminateMs timeout when item is removed', async () => {
        const showSpy = vi.fn()
        const progressItem = new ProgressItem({
          indeterminate: true,
          delayIndeterminateMs: 100,
        })
        progressItem.on('show', showSpy)

        // wait briefly but not long enough for delay
        await pause(30)
        expect(progressItem.visible).toBe(false)
        expect(showSpy).not.toHaveBeenCalled()

        // remove the item before delay fires
        progressItem.remove()

        // wait for delay to have fired (if it wasn't cancelled)
        await pause(150)

        // show should never have been called
        expect(showSpy).not.toHaveBeenCalled()
        expect(progressItem.visible).toBe(false)
      })

      it('should cancel delayIndeterminateMs timeout when item is cancelled', async () => {
        const showSpy = vi.fn()
        const progressItem = new ProgressItem({
          indeterminate: true,
          delayIndeterminateMs: 100,
        })
        progressItem.on('show', showSpy)

        // wait briefly but not long enough for delay
        await pause(30)
        expect(progressItem.visible).toBe(false)

        // cancel the item before delay fires
        progressItem.cancel()

        // wait for delay to have fired (if it wasn't cancelled)
        await pause(150)

        // show should never have been called
        expect(showSpy).not.toHaveBeenCalled()
      })

      it('should cancel delayIndeterminateMs timeout when item is completed', async () => {
        const showSpy = vi.fn()
        const progressItem = new ProgressItem({
          indeterminate: true,
          delayIndeterminateMs: 100,
          autoRemove: false, // don't auto-remove so we can check visibility
        })
        progressItem.on('show', showSpy)

        // wait briefly but not long enough for delay
        await pause(30)
        expect(progressItem.visible).toBe(false)

        // complete the item before delay fires
        progressItem.complete()

        // wait for delay to have fired (if it wasn't cancelled)
        await pause(150)

        // show should never have been called
        expect(showSpy).not.toHaveBeenCalled()
      })
    })
  })
})

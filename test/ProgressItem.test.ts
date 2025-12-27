/**
 * Tests for ProgressItem.ts
 */

import chai, { expect } from 'chai'
import { ProgressItem } from '../src/index'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'
import { pause } from './pause'

chai.use(sinonChai)

describe('ProgressItem', () => {
  describe('event emitters', () => {
    it('should emit a "update" event on setProgress()', () => {
      const updateSpy = sinon.spy()
      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.setProgress(0.1)

      expect(updateSpy.calledOnce).to.be.true
    })

    it('should emit a "update" event on update()', () => {
      const updateSpy = sinon.spy()
      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.update({ value: 0.1 })

      expect(updateSpy.calledOnce).to.be.true
    })

    it('should emit a "update" event on assignment of "value"', () => {
      const updateSpy = sinon.spy()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.value = 0.1

      expect(updateSpy.calledOnce).to.be.true
    })

    it('should emit a "update" event on assignment of "maxValue"', () => {
      const updateSpy = sinon.spy()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.maxValue = 0.1

      expect(updateSpy.calledOnce).to.be.true
    })

    it('should emit a "update" event on assignment of "title"', () => {
      const updateSpy = sinon.spy()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.title = 'test'

      expect(updateSpy.calledOnce).to.be.true
      expect(progressItem.title).to.equal('test')
    })

    it('should emit a "update" event on assignment of "detail"', () => {
      const updateSpy = sinon.spy()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.detail = 'test'

      expect(updateSpy.calledOnce).to.be.true
      expect(progressItem.detail).to.equal('test')
    })

    it('should emit a "update" event on assignment of "css"', () => {
      const updateSpy = sinon.spy()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.cssVars = {
        errorBackground: 'red',
      }

      expect(updateSpy.calledOnce).to.be.true
      expect(progressItem.cssVars).to.deep.equal({
        errorBackground: 'red',
      })
      expect(progressItem.cssTransferable).to.deep.equal([
        ['--error-background', 'red'],
      ])
    })

    it('should emit a "update" event on assignment of "theme"', () => {
      const updateSpy = sinon.spy()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.theme = 'none'

      expect(updateSpy.calledOnce).to.be.true
      expect(progressItem.theme).to.equal('none')
    })

    it('should emit a "update" event on assignment of "indeterminate"', () => {
      const updateSpy = sinon.spy()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.indeterminate = true

      expect(updateSpy.calledOnce).to.be.true
    })

    it('should emit a "update" event on assignment of "enableCancel"', () => {
      const updateSpy = sinon.spy()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.enableCancel = false

      expect(updateSpy.calledOnce).to.be.true
      expect(progressItem.enableCancel).to.be.false
    })

    it('should emit a "update" event on assignment of "enablePause"', () => {
      const updateSpy = sinon.spy()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.enablePause = true

      expect(updateSpy.calledOnce).to.be.true
      expect(progressItem.enablePause).to.be.true
    })

    it('should emit a "update" event on assignment of "error"', () => {
      const updateSpy = sinon.spy()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.error = true

      expect(updateSpy.calledOnce).to.be.true
      expect(progressItem.error).to.be.true
    })

    it('should emit a "update" event on assignment of "autoComplete"', () => {
      const updateSpy = sinon.spy()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.autoComplete = false

      expect(updateSpy.calledOnce).to.be.true
      expect(progressItem.autoComplete).to.be.false
    })

    it('should emit a "update" event on assignment of "removeOnComplete"', () => {
      const updateSpy = sinon.spy()

      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.removeOnComplete = false

      expect(updateSpy.calledOnce).to.be.true
      expect(progressItem.removeOnComplete).to.be.false
    })

    it('should NOT emit a "update" event on assignment of current options', () => {
      const updateSpy = sinon.spy()

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
        enableCancel: false,
        enablePause: true,
        error: true,
        autoComplete: false,
        removeOnComplete: false,
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
      progressItem.enableCancel = false
      progressItem.enablePause = true
      progressItem.error = true
      progressItem.autoComplete = false
      progressItem.removeOnComplete = false

      expect(updateSpy.called).to.be.false
    })

    // pause event
    it('should emit a "pause" event when paused', () => {
      const pauseSpy = sinon.spy()
      const progressItem = new ProgressItem()
      progressItem.on('pause', pauseSpy)

      progressItem.pause()

      expect(pauseSpy).to.have.been.calledOnce
      expect(pauseSpy).to.have.been.calledWith(true)

      progressItem.resume()
      expect(pauseSpy).to.have.been.calledTwice
      expect(pauseSpy).to.have.been.calledWith(false)
    })

    // will-cancel event
    it('should emit a "will-cancel" event when cancelled', () => {
      const willCancelSpy = sinon.spy()
      const progressItem = new ProgressItem()
      progressItem.on('will-cancel', willCancelSpy)

      progressItem.cancel()

      expect(willCancelSpy).to.have.been.calledOnce
    })

    // will-cancel with preventDefault
    it('should not emit a "cancelled" event when cancelled with preventDefault', () => {
      const cancelledSpy = sinon.spy()
      const progressItem = new ProgressItem()
      progressItem.on('cancelled', cancelledSpy)
      progressItem.on('will-cancel', (e) => e.preventDefault())

      progressItem.cancel()

      expect(cancelledSpy).to.not.have.been.called
    })

    // cancelled event
    it('should emit a "cancelled" event when cancelled', () => {
      const cancelledSpy = sinon.spy()
      const progressItem = new ProgressItem()
      progressItem.on('cancelled', cancelledSpy)

      progressItem.cancel()

      expect(cancelledSpy).to.have.been.calledOnce
    })

    // remove event
    it('should emit a "remove" event when removed', () => {
      const removeSpy = sinon.spy()
      const progressItem = new ProgressItem()
      progressItem.on('remove', removeSpy)

      progressItem.remove()

      expect(removeSpy).to.have.been.calledOnce
    })

    // complete event
    it('should emit a "complete" event when completed', () => {
      const completeSpy = sinon.spy()
      const progressItem = new ProgressItem()
      progressItem.on('complete', completeSpy)

      progressItem.setCompleted()

      expect(completeSpy).to.have.been.calledOnce
    })

    // emit complete event when progress is 100
    it('should emit a "complete" event when progress is 100', () => {
      const completeSpy = sinon.spy()
      const progressItem = new ProgressItem()
      progressItem.on('complete', completeSpy)

      progressItem.setProgress(100)

      expect(completeSpy).to.have.been.calledOnce
    })

    describe('show/hide', () => {
      it('should emit "show" when initiallyVisible is true', async () => {
        const showSpy = sinon.spy()
        const progressItem = new ProgressItem()
        progressItem.on('show', showSpy)

        // wait for events to fire
        await pause(20)

        expect(showSpy).to.have.been.calledOnce
        expect(progressItem.isVisible()).to.be.true
      })

      it('should not emit "show" immediately if initiallyVisible is false', async () => {
        const showSpy = sinon.spy()
        const progressItem = new ProgressItem({
          initiallyVisible: false,
        })
        progressItem.on('show', showSpy)

        // wait for events to fire
        await pause(1)

        expect(showSpy).to.not.have.been.called
        expect(progressItem.isVisible()).to.be.false
      })

      it('should emit "show" when show() is called', async () => {
        const showSpy = sinon.spy()
        const progressItem = new ProgressItem({
          initiallyVisible: false,
        })
        progressItem.on('show', showSpy)

        await pause(1)

        expect(progressItem.isVisible()).to.be.false
        expect(showSpy).to.not.have.been.called

        progressItem.show()

        // wait for events to fire
        await pause(1)

        expect(progressItem.isVisible()).to.be.true
        expect(showSpy).to.have.been.calledOnce
      })

      it('should emit "hide" when hide() is called', async () => {
        const hideSpy = sinon.spy()
        const progressItem = new ProgressItem()
        progressItem.on('hide', hideSpy)

        await pause(10)

        expect(progressItem.isVisible()).to.be.true
        expect(hideSpy).to.not.have.been.called

        progressItem.hide()

        // wait for events to fire
        await pause(1)

        expect(hideSpy).to.have.been.calledOnce
        expect(progressItem.isVisible()).to.be.false
      })

      it('should emit "show" after a delay when delayIndeterminateMs has value', async () => {
        const showSpy = sinon.spy()
        const progressItem = new ProgressItem({
          indeterminate: true,
          delayIndeterminateMs: 100,
        })
        progressItem.on('show', showSpy)

        // wait for events to fire
        await pause(1)

        expect(progressItem.isVisible()).to.be.false
        expect(showSpy).to.not.have.been.called

        // wait for delayIndeterminateMs
        await pause(150)

        expect(progressItem.isVisible()).to.be.true
        expect(showSpy).to.have.been.calledOnce
      })

      it('should emit "show" immediately when delayIndeterminateMs is 0', async () => {
        const showSpy = sinon.spy()
        const progressItem = new ProgressItem({
          indeterminate: true,
          delayIndeterminateMs: 0,
        })
        progressItem.on('show', showSpy)

        // wait for setImmediate to fire
        await pause(20)

        expect(progressItem.isVisible()).to.be.true
        expect(showSpy).to.have.been.calledOnce
      })

      it('should emit "show" immediately when delayIndeterminateMs is negative', async () => {
        const showSpy = sinon.spy()
        const progressItem = new ProgressItem({
          indeterminate: true,
          delayIndeterminateMs: -100,
        })
        progressItem.on('show', showSpy)

        // wait for events to fire
        await pause(20)

        expect(progressItem.isVisible()).to.be.true
        expect(showSpy).to.have.been.calledOnce
      })

      it('should emit "show" immediately when delayIndeterminateMs is null', async () => {
        const showSpy = sinon.spy()
        const progressItem = new ProgressItem({
          indeterminate: true,
          delayIndeterminateMs: null,
        })
        progressItem.on('show', showSpy)

        // wait for events to fire
        await pause(20)

        expect(progressItem.isVisible()).to.be.true
        expect(showSpy).to.have.been.calledOnce
      })

      it('should emit "show" after a delay when showWhenEstimateExceedsMs has value', async () => {
        const showSpy = sinon.spy()
        const progressItem = new ProgressItem({
          showWhenEstimateExceedsMs: 200,
        })
        progressItem.on('show', showSpy)

        // wait for events to fire
        await pause(1)

        expect(progressItem.isVisible()).to.be.false
        expect(showSpy).to.not.have.been.called
        expect(progressItem.getEstimatedTotalTime()).to.be.undefined

        // wait for showWhenEstimateExceedsMs
        await pause(100)
        progressItem.setProgress(49)
        expect(progressItem.getEstimatedTotalTime()).to.be.greaterThan(200)
        await pause(1)

        expect(showSpy).to.have.been.calledOnce
        expect(progressItem.isVisible()).to.be.true
      })

      it('should not emit "show" when estimated time exceeds showWhenEstimateExceedsMs', async () => {
        const showSpy = sinon.spy()
        const progressItem = new ProgressItem({
          showWhenEstimateExceedsMs: 2000,
        })
        progressItem.on('show', showSpy)

        // wait for events to fire
        await pause(1)

        expect(progressItem.isVisible()).to.be.false
        expect(showSpy).to.not.have.been.called
        expect(progressItem.getEstimatedTotalTime()).to.be.undefined

        // wait for showWhenEstimateExceedsMs
        await pause(100)
        progressItem.setProgress(49)
        expect(progressItem.getEstimatedTotalTime()).to.be.lessThan(2000)
        await pause(1)

        expect(showSpy).to.not.have.been.called
        expect(progressItem.isVisible()).to.be.false
      })

      it('should emit "show" immediately when showWhenEstimateExceedsMs is 0', async () => {
        const showSpy = sinon.spy()
        const progressItem = new ProgressItem({
          showWhenEstimateExceedsMs: 0,
        })
        progressItem.on('show', showSpy)

        // wait for events to fire
        await pause(10)

        expect(progressItem.isVisible()).to.be.true
        expect(showSpy).to.have.been.calledOnce
      })

      it('should emit "show" immediately when showWhenEstimateExceedsMs is negative', async () => {
        const showSpy = sinon.spy()
        const progressItem = new ProgressItem({
          showWhenEstimateExceedsMs: -100,
        })
        progressItem.on('show', showSpy)

        // wait for events to fire
        await pause(10)

        expect(progressItem.isVisible()).to.be.true
        expect(showSpy).to.have.been.calledOnce
      })

      it('should emit "show" immediately when showWhenEstimateExceedsMs is null', async () => {
        const showSpy = sinon.spy()
        const progressItem = new ProgressItem({
          showWhenEstimateExceedsMs: null,
        })
        progressItem.on('show', showSpy)

        // wait for events to fire
        await pause(10)

        expect(progressItem.isVisible()).to.be.true
        expect(showSpy).to.have.been.calledOnce
      })
    })
  })
})

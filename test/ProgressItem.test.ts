/**
 * Tests for ProgressItem.ts
 */

import chai, { expect } from 'chai'
import { ProgressItem } from '../src/index'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'

chai.use(sinonChai)

describe('ProgressItem', () => {
  describe('event emitters', () => {
    it('should emit a "update" event when updated', () => {
      const updateSpy = sinon.spy()
      const progressItem = new ProgressItem()
      progressItem.on('update', updateSpy)

      progressItem.setProgress(0.1)

      expect(updateSpy.calledOnce).to.be.true
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
  })
})

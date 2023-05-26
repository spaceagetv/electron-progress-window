import { EventEmitter } from 'events'
import { merge } from 'lodash'
import TypedEmitter from 'typed-emitter'
// import { logger } from '../logger'

// logger.setLevel(LogLevel.DEBUG)

// const logger = {
//   log: console.log,
//   error: console.error,
//   warn: console.warn,
//   info: console.info,
//   debug: console.debug,
//   silly: console.debug,
// }

/**
 * Options for creating a new progress item
 * @see ProgressItem
 * @public
 */
export type ProgressItemOptions = Pick<
  ProgressItem,
  | 'title'
  | 'detail'
  | 'indeterminate'
  | 'value'
  | 'maxValue'
  | 'enableCancel'
  | 'enablePause'
  | 'autoComplete'
  | 'removeOnComplete'
>

/**
 * Transferable version of ProgressItem - used for IPC
 * @internal
 */
export type ProgressItemTransferable = ProgressItemOptions &
  Pick<ProgressItem, 'id' | 'paused'>

/**
 * Events emitted by a ProgressItem instance
 * @public
 */
export type ProgressItemEvents = {
  /** Item was updated - @public */
  update: () => void
  /** Item was completed - @public */
  complete: () => void
  /** Item was removed - @public */
  remove: () => void
  /** Item was cancelled - @public */
  cancelled: () => void
  /** Item was paused - @public */
  pause: (bool: boolean) => void
}

/**
 * A progress bar item within a ProgressWindow. There shouldn't be much need to call this directly.
 * Instead use ProgressWindow.addItem() or progressWindowInstance.addItem()
 * @public
 */
export class ProgressItem extends (EventEmitter as new () => TypedEmitter<ProgressItemEvents>) {
  /** Default options for a progress bar item. @readonly @public */
  readonly defaults: ProgressItemOptions = {
    title: '',
    detail: '',
    indeterminate: false,
    value: 0,
    maxValue: 100,
    enableCancel: true,
    enablePause: false,
    autoComplete: true,
    removeOnComplete: true,
  }

  /** Unique ID for the progress bar item - start with alpha for HTML id - @public @readonly */
  readonly id: string = 'p' + Math.random().toString(36).substring(2, 11)

  /** Title of the progress bar item */
  title: string

  /** Detail shown below the progress bar */
  detail: string

  /** Is the item indeterminate? */
  indeterminate: boolean

  /** Current (or initial) value */
  _value: number

  /** Maximum value */
  maxValue: number

  /** Is the item cancellable? Will show cancel button. Default: true */
  enableCancel: boolean

  /** Is the item pauseable? Will show pause button. Default: false */
  enablePause: boolean

  /** Automatically complete if value greater than or equals to maxValue. Default: true */
  autoComplete: boolean

  /** Remove immediately when item is completed? Or wait for window behavior. */
  removeOnComplete: boolean

  /** Is the item completed? */
  private completed = false

  /** Is this progress item paused? */
  paused = false

  /** Has this progress item been cancelled? */
  cancelled = false

  /** Has the item been removed? */
  removed = false

  constructor(options = {} as Partial<ProgressItemOptions>) {
    super()
    this._value = options.value || this.defaults.value
    const o = { ...options }
    delete o.value
    merge(this, this.defaults, o)
  }

  /** Get/set the current progress value */
  get value() {
    return this._value
  }

  set value(value: number) {
    this.setProgress(value)
  }

  /**
   * Set progress value and optionally update other options
   * @param value - progress value
   * @param otherOptions - other options to update
   * @returns void
   */
  setProgress(
    value: number,
    otherOptions = {} as Partial<ProgressItemOptions>
  ) {
    // istanbul ignore if
    if (this.removed) {
      return
    }
    // logger.silly('ProgressItem.setProgress()', value, otherOptions)
    if (!this.isIndeterminate()) {
      this._value = Math.min(value, this.maxValue)
    }
    merge(this, otherOptions)
    this.emit('update')
    if (this.autoComplete && this._value === this.maxValue) {
      this.setCompleted()
    }
  }

  /**
   * Set the progress item to completed.
   * Automatically sets value to maxValue.
   * If removeOnComplete is true, the item will be removed.
   * @returns void
   */
  setCompleted() {
    // logger.debug('ProgressItem.setCompleted()')
    if (this.isCompleted() || this.removed) {
      return
    }
    this._value = this.maxValue
    this.completed = true
    this.emit('complete')
    if (this.removeOnComplete) {
      this.remove()
    }
  }

  /** Is this item completed? */
  isCompleted() {
    return this.completed
  }

  /** Is this item in progress? */
  isInProgress() {
    return !this.isCompleted()
  }

  /** Is this item indeterminate? */
  isIndeterminate() {
    return this.indeterminate
  }

  /** Remove the ProgressItem from the ProgressWindow */
  remove() {
    // logger.debug('ProgressItem.remove()')
    this.removed = true
    this.emit('remove')
  }

  /** Cancel the ProgressItem */
  cancel() {
    if (this.cancelled || this.removed) {
      return
    }
    // logger.debug('ProgressItem.cancel()')
    this.cancelled = true
    this.emit('cancelled')
    this.remove()
  }

  /**
   * Pause/resume the ProgressItem
   * @param shouldPause - should the item be paused? Default: true
   */
  pause(shouldPause = true) {
    // logger.debug('ProgressItem.pause()')
    // istanbul ignore if
    if (this.paused === shouldPause) {
      return
    }
    this.paused = shouldPause
    this.emit('pause', shouldPause)
  }

  /** Resume if paused */
  resume() {
    this.pause(false)
  }

  /** Toggle pause state */
  togglePause() {
    this.pause(!this.paused)
  }

  /** Get a transferable object for IPC - @internal */
  transferable() {
    return {
      id: this.id,
      title: this.title,
      detail: this.detail,
      indeterminate: this.indeterminate,
      autoComplete: this.autoComplete,
      value: this.value,
      maxValue: this.maxValue,
      enableCancel: this.enableCancel,
      enablePause: this.enablePause,
      completed: this.completed,
      removeOnComplete: this.removeOnComplete,
      paused: this.paused,
    } as ProgressItemTransferable
  }
}

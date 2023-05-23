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

export type ProgressItemTransferable = ProgressItemOptions &
  Pick<ProgressItem, 'id' | 'paused'>

export type ProgressItemEvents = {
  update: () => void
  complete: () => void
  remove: () => void
  cancelled: () => void
  pause: (bool: boolean) => void
}

export class ProgressItem extends (EventEmitter as new () => TypedEmitter<ProgressItemEvents>) {
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

  /** Unique ID for the progress bar item - start with alpha for HTML id */
  id: string = 'p' + Math.random().toString(36).substring(2, 11)

  /** Title of the progress bar item */
  title: string
  /** Detail */
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

  /** Automatically complete if value >= maxValue. Default: true */
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

  isCompleted() {
    return this.completed
  }

  isInProgress() {
    return !this.isCompleted()
  }

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

  /** Pause the ProgressItem */
  pause(shouldPause = true) {
    // logger.debug('ProgressItem.pause()')
    // istanbul ignore if
    if (this.paused === shouldPause) {
      return
    }
    this.paused = shouldPause
    this.emit('pause', shouldPause)
  }

  resume() {
    this.pause(false)
  }

  togglePause() {
    this.pause(!this.paused)
  }

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

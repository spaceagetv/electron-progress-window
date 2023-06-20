import { EventEmitter } from 'events'
import { isEqual, merge } from 'lodash'
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
export type ProgressItemOptions = Partial<
  Pick<
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
>

/**
 * Transferable version of ProgressItem - used for IPC
 * @internal
 */
export type ProgressItemTransferable = ProgressItemOptions &
  Pick<ProgressItem, 'id' | 'paused'>

/**
 * Events emitted by a ProgressItem instance
 *
 * @remarks
 *
 * Events:<br/>
 * - `update` - Item was updated. listener: `() => void`<br/>
 * - `complete` - Item was completed. listener: `() => void`<br/>
 * - `remove` - Item was removed. listener: `() => void`<br/>
 * - `will-cancel` - Item will cancel. Call event.preventDefault() to stop it. listener: `(event: Event) => void`<br/>
 * - `cancelled` - Item was cancelled. listener: `() => void`<br/>
 * - `pause` - Item was paused. listener: `(isPaused: boolean) => void`<br/>
 *
 * @public
 */
export type ProgressItemEvents = {
  /** Item was updated - @public */
  update: () => void
  /** Item was completed - @public */
  complete: () => void
  /** Item was removed - @public */
  remove: () => void
  /** Item will cancel. Call event.preventDefault() to stop it. */
  'will-cancel': (event: Event) => void
  /** Item was cancelled - @public */
  cancelled: () => void
  /** Item was paused - @public */
  pause: (isPaused: boolean) => void
}

/** @internal */
export type TypedEmitterProgressItemEvents =
  new () => TypedEmitter<ProgressItemEvents>

/** @internal */
export const ProgressItemEventsEmitter =
  EventEmitter as TypedEmitterProgressItemEvents

/**
 * A progress bar item within a ProgressWindow. There shouldn't be much need to call this directly.
 * Instead use ProgressWindow.addItem() or progressWindowInstance.addItem()
 * @public
 */
export class ProgressItem extends ProgressItemEventsEmitter {
  /** Private properties for a progress bar item. @internal */
  _privates: ProgressItemOptions = {
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

  /** Is the item completed? */
  private _completed = false

  /** Is this progress item paused? */
  paused = false

  /** Has this progress item been cancelled? */
  cancelled = false

  /** Has the item been removed? */
  removed = false

  constructor(options = {} as ProgressItemOptions) {
    super()
    merge(this._privates, options)
  }

  /** Get/set the current progress value */
  get value() {
    return this._privates.value
  }

  set value(value: number) {
    this.update({ value })
  }

  /** Get/set the title */
  get title() {
    return this._privates.title
  }

  set title(title: string) {
    this.update({ title })
  }

  get detail() {
    return this._privates.detail
  }

  set detail(detail: string) {
    this.update({ detail })
  }

  /** Is the item indeterminate? */
  get indeterminate(): boolean {
    return this._privates.indeterminate
  }

  set indeterminate(indeterminate: boolean) {
    this.update({ indeterminate })
  }

  /** Maximum value */
  get maxValue(): number {
    return this._privates.maxValue
  }

  set maxValue(maxValue: number) {
    this.update({ maxValue })
  }

  /** Is the item cancellable? Will show cancel button. Default: true */
  get enableCancel(): boolean {
    return this._privates.enableCancel
  }

  set enableCancel(enableCancel: boolean) {
    this.update({ enableCancel })
  }

  /** Is the item pauseable? Will show pause button. Default: false */
  get enablePause(): boolean {
    return this._privates.enablePause
  }

  set enablePause(enablePause: boolean) {
    this.update({ enablePause })
  }

  /** Automatically complete if value greater than or equals to maxValue. Default: true */
  get autoComplete(): boolean {
    return this._privates.autoComplete
  }

  set autoComplete(autoComplete: boolean) {
    this.update({ autoComplete })
  }

  /** Remove immediately when item is completed? Or wait for window behavior. */
  get removeOnComplete(): boolean {
    return this._privates.removeOnComplete
  }

  set removeOnComplete(removeOnComplete: boolean) {
    this.update({ removeOnComplete })
  }

  /**
   * Set progress value and optionally update other properties
   * @param value - progress value
   * @param otherOptions - other options to update
   * @returns void
   */
  setProgress(
    value: number,
    otherOptions = {} as Omit<ProgressItemOptions, 'value'>
  ) {
    if (this.indeterminate) return
    this.update({ value, ...otherOptions })
  }

  /**
   * Update one or more values simultaneously
   * @param options - options to update
   */
  update(options: Partial<ProgressItemOptions>) {
    // logger.silly('ProgressItem.update()', options)
    // istanbul ignore if
    if (this.removed) {
      return
    }
    if (isEqual(this._privates, options)) {
      return
    }
    this._privates = { ...this._privates, ...options }
    this.emit('update')
    if (
      !this.isCompleted() &&
      this.autoComplete &&
      this._privates.value >= this.maxValue
    ) {
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
    this._privates.value = this.maxValue
    this._completed = true
    this.emit('complete')
    if (this.removeOnComplete) {
      this.remove()
    }
  }

  /** Is this item completed? */
  isCompleted() {
    return this._completed
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
    const event = new Event('will-cancel', { cancelable: true })
    this.emit('will-cancel', event)
    if (event.defaultPrevented) {
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
      completed: this._completed,
      removeOnComplete: this.removeOnComplete,
      paused: this.paused,
    } as ProgressItemTransferable
  }
}

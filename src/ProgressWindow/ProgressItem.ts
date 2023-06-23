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

export type ProgressItemTheme = 'stripes' | 'none'

/**
 * Options for creating a new progress item
 * @see ProgressItem
 * @public
 */
export type ProgressItemOptions = Pick<
  ProgressItem,
  | 'autoComplete'
  | 'cssVars'
  | 'detail'
  | 'enableCancel'
  | 'enablePause'
  | 'error'
  | 'indeterminate'
  | 'maxValue'
  | 'removeOnComplete'
  | 'theme'
  | 'title'
  | 'value'
>

export const itemCssMap = {
  /** Font-size property. Default 15px */
  fontSize: '--font-size',
  /** Height of the progress bar. Default: 6px */
  progressHeight: '--progress-height',
  /** Padding around the progress bar. Shows progressBackground. Default: 2px */
  progressPadding: '--progress-padding',
  /** Background of the progress bar. Default: #ffffff6c */
  progressBackground: '--progress-background',
  /** Foreground of the progress bar. This is actually the "background" property on a div. Default: #1f65fd */
  progressForeground: '--progress-foreground',
  /** Background of the item's containing div. */
  itemBackground: '--item-background',
  /** Border radius of the item's containing div. Default: 4px */
  itemBorderRadius: '--item-border-radius',
  /** Background color of the progress bar when paused. Default: #a3a3a338 */
  pausedBackground: '--paused-background',
  /** Background the item's containing div when error is true. Default: #b54545 */
  errorBackground: '--error-background',
  /** Text color of the containing div when error is true. Default: #ffffff */
  errorTextColor: '--error-text-color',
  /** Background of the progress bar when error is true. Default: #ffffff6c */
  errorProgressBackground: '--error-progress-background',
  /** Foreground of the progress bar when error is true. Default: #670000 */
  errorProgressForeground: '--error-progress-foreground',
} as const

export type ItemCssProperty = keyof typeof itemCssMap
export type ItemCssValue = (typeof itemCssMap)[ItemCssProperty]
export type ItemCss = Partial<Record<ItemCssProperty, string>>
export type TransferableItemCss = [ItemCssValue, string][]

/**
 * Transferable version of ProgressItem - used for IPC
 * @internal
 */
export type ProgressItemTransferable = Required<
  Omit<ProgressItemOptions, 'css'>
> &
  Pick<ProgressItem, 'id' | 'paused' | 'cancelled'> & {
    /** Is the item finished? */
    completed: boolean
    cssVars: TransferableItemCss
  }

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
    cssVars: {},
    theme: 'stripes',
    indeterminate: false,
    value: 0,
    maxValue: 100,
    enableCancel: true,
    enablePause: false,
    error: false,
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

  constructor(options = {} as Partial<ProgressItemOptions>) {
    super()
    merge(this._privates, options)
    // console.log('ProgressItem constructor', this._privates)
  }

  /** Get/set the current progress value */
  get value() {
    return this._privates.value
  }

  set value(value: number) {
    this.update({ value })
  }

  /** Title appears above the progress bar */
  get title() {
    return this._privates.title
  }

  set title(title: string) {
    this.update({ title })
  }

  /** Detail field shows below the progress bar */
  get detail() {
    return this._privates.detail
  }

  set detail(detail: string) {
    this.update({ detail })
  }

  /** CSS variables */
  get cssVars() {
    return this._privates.cssVars
  }

  set cssVars(cssVars: ItemCss) {
    this.update({ cssVars })
  }

  /** @internal */
  get cssTransferable() {
    const css = this._privates.cssVars
    return Object.entries(css)
      .map(([key, value]) => {
        // istanbul ignore if
        if (!itemCssMap[key as ItemCssProperty]) return
        const transferableKey = itemCssMap[key as ItemCssProperty]
        return [transferableKey, value] as const
      })
      .filter(Boolean) as [ItemCssValue, string][]
  }

  /** Indeterminate? */
  get indeterminate(): boolean {
    return this._privates.indeterminate
  }

  set indeterminate(indeterminate: boolean) {
    this.update({ indeterminate })
  }

  get theme(): ProgressItemTheme {
    return this._privates.theme
  }

  set theme(theme: ProgressItemTheme) {
    this.update({ theme })
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

  /** Add an "error" class to the div.progress-item element */
  get error(): boolean {
    return this._privates.error
  }

  set error(error: boolean) {
    this.update({ error })
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
    otherOptions = {} as Partial<Omit<ProgressItemOptions, 'value'>>
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
    const hasChanged = Object.entries(options).some(
      ([key, val]: [
        keyof ProgressItemOptions,
        ProgressItemOptions[keyof ProgressItemOptions]
      ]) => !isEqual(this._privates[key], val)
    )
    // if none of the options have changed, return
    if (!hasChanged) {
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
  transferable(): ProgressItemTransferable {
    return {
      autoComplete: this.autoComplete,
      cancelled: this.cancelled,
      completed: this.isCompleted(),
      cssVars: this.cssTransferable,
      detail: this.detail,
      enableCancel: this.enableCancel,
      enablePause: this.enablePause,
      error: this.error,
      id: this.id,
      indeterminate: this.indeterminate,
      maxValue: this.maxValue,
      paused: this.paused,
      removeOnComplete: this.removeOnComplete,
      title: this.title,
      theme: this.theme,
      value: this.value,
    }
  }
}

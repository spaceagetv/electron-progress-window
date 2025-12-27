import { EventEmitter } from 'events'
import { deepEqual, deepMerge } from './utils'

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
  | 'initiallyVisible'
  | 'delayIndeterminateMs'
  | 'showWhenEstimateExceedsMs'
>

export const itemCssMap = {
  /** Font-size property. Default 15px */
  fontSize: '--font-size',
  /** Font-family property. Default: system-ui, sans-serif */
  fontFamily: '--font-family',
  /** Text color */
  textColor: '--text-color',
  /** Height of the progress bar. Default: 6px */
  progressHeight: '--progress-height',
  /** Padding around the progress bar. Shows progressBackground. Default: 2px */
  progressPadding: '--progress-padding',
  /** Background of the progress bar. Default: #ffffff6c */
  progressBackground: '--progress-background',
  /** Foreground of the progress bar. This is actually the "background" property on a div. Default: #1f65fd */
  progressForeground: '--progress-foreground-color',
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
  Omit<
    ProgressItemOptions,
    | 'css'
    | 'initiallyVisible'
    | 'delayIndeterminateMs'
    | 'showWhenEstimateExceedsMs'
  >
> &
  Pick<ProgressItem, 'id' | 'paused' | 'cancelled'> & {
    /** Is the item finished? */
    completed: boolean
    /** CSS variable values */
    cssVars: TransferableItemCss
    /** Is the item visible? */
    visible: boolean
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
 * - `hide` - Item is being hidden. listener: `() => void`<br/>
 * - `show` - Item is being shown. listener: `() => void`<br/>
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
  /** Item is being hidden */
  hide: () => void
  /** Item is being shown */
  show: () => void
}

/**
 * Typed EventEmitter interface for ProgressItem events.
 * Provides type-safe on/emit/off methods.
 * @internal
 */
export interface TypedEventEmitter<T> {
  on<K extends keyof T>(event: K, listener: T[K]): this
  once<K extends keyof T>(event: K, listener: T[K]): this
  off<K extends keyof T>(event: K, listener: T[K]): this
  emit<K extends keyof T>(
    event: K,
    ...args: T[K] extends (...args: infer A) => unknown ? A : never
  ): boolean
  removeAllListeners<K extends keyof T>(event?: K): this
}

/** @internal */
export const ProgressItemEventsEmitter =
  EventEmitter as new () => TypedEventEmitter<ProgressItemEvents>

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
    initiallyVisible: true,
    delayIndeterminateMs: 0,
    showWhenEstimateExceedsMs: 0,
  }

  /** Unique ID for the progress bar item - start with alpha for HTML id - @public @readonly */
  readonly id: string = 'p' + Math.random().toString(36).substring(2, 11)

  /** Is the item completed? @internal */
  private _completed = false

  private _visible = false

  private _startTime: number | null = null

  /** Is this progress item paused? */
  paused = false

  /** Has this progress item been cancelled? */
  cancelled = false

  /** Has the item been removed? */
  removed = false

  constructor(options = {} as Partial<ProgressItemOptions>) {
    super()
    deepMerge(this._privates, {
      ...options,
      delayIndeterminateMs: Math.max(0, options.delayIndeterminateMs || 0),
      showWhenEstimateExceedsMs: Math.max(
        0,
        options.showWhenEstimateExceedsMs || 0
      ),
    })

    this._startTime = Date.now()
    this.handleVisibility()
  }

  /**
   * Handle visibility logic for the progress item.
   * Determines whether the item should be shown immediately or after a delay.
   */
  private handleVisibility() {
    let shouldShow = false

    if (this.isIndeterminate()) {
      shouldShow = this.initiallyVisible && this.delayIndeterminateMs <= 0
      if (!shouldShow && this.delayIndeterminateMs > 0) {
        setTimeout(() => {
          if (this.isInProgress()) {
            this.show()
          }
        }, this.delayIndeterminateMs)
      }
    } else {
      shouldShow = this.initiallyVisible && this.showWhenEstimateExceedsMs <= 0
    }

    if (shouldShow) {
      setImmediate(() => {
        this.show()
      })
    }
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
   * Should this item be shown initially?
   * If false, it will be hidden until you call show().
   *
   * Default: true
   */
  get initiallyVisible(): boolean {
    return this._privates.initiallyVisible
  }

  /**
   * Delay showing the indeterminate progress bar until this many milliseconds have passed.
   * This is useful to avoid showing the progress bar for items that complete quickly. Ignored
   * for determinate items.
   *
   * Default: 0 (show immediately)
   */
  get delayIndeterminateMs(): number {
    return this._privates.delayIndeterminateMs || 0
  }

  /**
   * Show the progress bar when the estimated time to completion exceeds this many milliseconds.
   * If the estimated time is less than this, the progress bar will be hidden. This is useful
   * to hide items that complete quickly. Note that the estimate cannot be calculated until
   * a second progress value is set (after the initial item has been created). We cannot estimate
   * indeterminate items, so this will be ignored for those.
   *
   * Default: 0 (show immediately)
   */
  get showWhenEstimateExceedsMs(): number {
    return this._privates.showWhenEstimateExceedsMs || 0
  }

  /**
   * Set progress value and optionally update other properties.
   * If indeterminate, this will do nothing.
   * If value is greater than or equal to maxValue, this will complete the item.
   * Default maxValue is 100, but it may have been changed.
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

  getEstimatedTotalTime(): number | undefined {
    if (this.indeterminate) return
    if (this.value === 0) return
    if (this.value >= this.maxValue) return
    const elapsed = Date.now() - this._startTime
    const estimatedTotalTime = (elapsed / this.value) * this.maxValue
    return estimatedTotalTime
  }

  /**
   * Update one or more values simultaneously
   * @param options - options to update
   */
  update(options: Partial<ProgressItemOptions>) {
    // istanbul ignore if
    if (this.removed) {
      return
    }
    const hasChanged = Object.entries(options).some(
      ([key, val]: [
        keyof ProgressItemOptions,
        ProgressItemOptions[keyof ProgressItemOptions]
      ]) => !deepEqual(this._privates[key], val)
    )
    // if none of the options have changed, return
    if (!hasChanged) {
      return
    }
    this._privates = { ...this._privates, ...options }
    this.emit('update')
    // if we're not visible and the estimated time remaining is greater than the threshold, show
    if (
      !this.isVisible() &&
      this.getEstimatedTotalTime() > this.showWhenEstimateExceedsMs
    ) {
      this.show()
    }
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

  /** Is this item visible? */
  isVisible() {
    return !this.removed && !!this._visible
  }

  /** Remove the ProgressItem from the ProgressWindow */
  remove() {
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
    this.cancelled = true
    this.emit('cancelled')
    this.remove()
  }

  /**
   * Pause/resume the ProgressItem
   * @param shouldPause - should the item be paused? Default: true
   */
  pause(shouldPause = true) {
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

  /** Show the ProgressItem */
  show() {
    // istanbul ignore if
    if (this._visible === true) {
      return
    }
    this._visible = true
    this.emit('show')
  }

  /** Hide the ProgressItem */
  hide() {
    if (this._visible === false) {
      return
    }
    this._visible = false
    this.emit('hide')
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
      visible: this._visible,
    }
  }
}

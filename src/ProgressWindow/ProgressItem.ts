import { EventEmitter } from 'events'
import { deepEqual, deepMerge } from './utils'

/**
 * A simple cancelable event that works in both Node.js and browser environments.
 * Unlike the DOM Event class, this is available in pure Node.js.
 * @public
 */
export class CancelableEvent {
  readonly type: string
  private _defaultPrevented = false

  constructor(type: string) {
    this.type = type
  }

  /** Prevent the default action associated with this event */
  preventDefault(): void {
    this._defaultPrevented = true
  }

  /** Whether preventDefault() has been called */
  get defaultPrevented(): boolean {
    return this._defaultPrevented
  }
}

export type ProgressItemTheme = 'stripes' | 'none'

/**
 * Options for creating a new progress item
 * @see ProgressItem
 * @public
 */
export type ProgressItemOptions = Pick<
  ProgressItem,
  | 'completeAutomatically'
  | 'cssVars'
  | 'detail'
  | 'cancellable'
  | 'pauseable'
  | 'error'
  | 'indeterminate'
  | 'maxValue'
  | 'autoRemove'
  | 'theme'
  | 'title'
  | 'value'
  | 'initiallyVisible'
  | 'delayIndeterminateMs'
  | 'showWhenEstimateExceedsMs'
  | 'identifier'
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
export type ProgressItemTransferable = {
  id: string
  title: string
  detail: string
  value: number
  maxValue: number
  indeterminate: boolean
  theme: ProgressItemTheme
  error: boolean
  cancellable: boolean
  pauseable: boolean
  completeAutomatically: boolean
  autoRemove: boolean
  paused: boolean
  cancelled: boolean
  completed: boolean
  visible: boolean
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
 * - `willCancel` - Item will cancel. Call event.preventDefault() to stop it. listener: `(event: CancelableEvent) => void`<br/>
 * - `cancelled` - Item was cancelled. listener: `() => void`<br/>
 * - `paused` - Item pause state changed. listener: `(isPaused: boolean) => void`<br/>
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
  willCancel: (event: CancelableEvent) => void
  /** Item was cancelled - @public */
  cancelled: () => void
  /** Item pause state changed - @public */
  paused: (isPaused: boolean) => void
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
  #options: ProgressItemOptions = {
    title: '',
    detail: '',
    cssVars: {},
    theme: 'stripes',
    indeterminate: false,
    value: 0,
    maxValue: 100,
    cancellable: true,
    pauseable: false,
    error: false,
    completeAutomatically: true,
    autoRemove: true,
    initiallyVisible: true,
    delayIndeterminateMs: 0,
    showWhenEstimateExceedsMs: 0,
    identifier: undefined,
  }

  /** Unique ID for the progress bar item - start with alpha for HTML id - @public @readonly */
  readonly id: string

  /** Is the item completed? @internal */
  #completed = false

  #visible = false

  #startTime: number | null = null

  /** Is this progress item paused? @internal */
  #paused = false

  /** Has this progress item been cancelled? */
  cancelled = false

  /** Has the item been removed? */
  removed = false

  /** @internal - Timeout for delayed visibility */
  #visibilityTimeout: ReturnType<typeof setTimeout> | null = null

  constructor(options = {} as Partial<ProgressItemOptions>) {
    super()

    // Set the ID first - use custom identifier if provided, otherwise generate one
    // Sanitize identifier to ensure it's a valid HTML id attribute
    const rawIdentifier =
      options.identifier || 'p' + Math.random().toString(36).substring(2, 11)
    this.id = this.sanitizeIdentifier(rawIdentifier)

    deepMerge(this.#options, {
      ...options,
      delayIndeterminateMs: Math.max(0, options.delayIndeterminateMs || 0),
      showWhenEstimateExceedsMs: Math.max(
        0,
        options.showWhenEstimateExceedsMs || 0
      ),
    })

    this.#startTime = Date.now()
    this.handleVisibility()
  }

  /**
   * Sanitizes an identifier to ensure it's a valid HTML id attribute.
   * HTML id attributes must start with a letter (a-zA-Z) and can only contain
   * letters, digits, hyphens, underscores, colons, and periods.
   *
   * Note: This uses a permissive approach that encodes characters rather than
   * rejecting them, so any string can be used as an identifier safely.
   *
   * @param identifier - The raw identifier to sanitize
   * @returns A valid HTML id attribute
   */
  private sanitizeIdentifier(identifier: string): string {
    if (!identifier || typeof identifier !== 'string') {
      return 'p' + Math.random().toString(36).substring(2, 11)
    }

    // Use encodeURIComponent to handle special characters safely
    // This preserves the original identifier while making it HTML-safe
    const encoded = encodeURIComponent(identifier)

    // Ensure it starts with a letter (if not, prefix with 'id-')
    if (!/^[a-zA-Z]/.test(encoded)) {
      return 'id-' + encoded
    }

    return encoded
  }

  /**
   * Handle visibility logic for the progress item.
   * Determines whether the item should be shown immediately or after a delay.
   */
  private handleVisibility() {
    let shouldShow = false

    if (this.indeterminate) {
      shouldShow = this.initiallyVisible && this.delayIndeterminateMs <= 0
      if (!shouldShow && this.delayIndeterminateMs > 0) {
        this.#visibilityTimeout = setTimeout(() => {
          this.#visibilityTimeout = null
          if (this.inProgress && !this.removed) {
            this.show()
          }
        }, this.delayIndeterminateMs)
      }
    } else {
      shouldShow = this.initiallyVisible && this.showWhenEstimateExceedsMs <= 0
    }

    if (shouldShow) {
      setImmediate(() => {
        if (!this.removed) {
          this.show()
        }
      })
    }
  }

  /** Clear any pending visibility timeout */
  private clearVisibilityTimeout() {
    if (this.#visibilityTimeout !== null) {
      clearTimeout(this.#visibilityTimeout)
      this.#visibilityTimeout = null
    }
  }

  /** Get/set the current progress value */
  get value() {
    return this.#options.value
  }

  set value(value: number) {
    this.update({ value })
  }

  /** Title appears above the progress bar */
  get title() {
    return this.#options.title
  }

  set title(title: string) {
    this.update({ title })
  }

  /** Detail field shows below the progress bar */
  get detail() {
    return this.#options.detail
  }

  set detail(detail: string) {
    this.update({ detail })
  }

  /** CSS variables */
  get cssVars() {
    return this.#options.cssVars
  }

  set cssVars(cssVars: ItemCss) {
    this.update({ cssVars })
  }

  /** @internal */
  get cssTransferable() {
    const css = this.#options.cssVars
    return Object.entries(css)
      .map(([key, value]) => {
        // istanbul ignore if
        if (!itemCssMap[key as ItemCssProperty]) return
        const transferableKey = itemCssMap[key as ItemCssProperty]
        return [transferableKey, value] as const
      })
      .filter(Boolean) as [ItemCssValue, string][]
  }

  /** Is this a indeterminate progress bar (no specific value)? */
  get indeterminate(): boolean {
    return this.#options.indeterminate
  }

  set indeterminate(indeterminate: boolean) {
    this.update({ indeterminate })
  }

  /** Visual theme for the progress bar */
  get theme(): ProgressItemTheme {
    return this.#options.theme
  }

  set theme(theme: ProgressItemTheme) {
    this.update({ theme })
  }

  /** Maximum value (default: 100) */
  get maxValue(): number {
    return this.#options.maxValue
  }

  set maxValue(maxValue: number) {
    this.update({ maxValue })
  }

  /** Can this item be cancelled? Shows cancel button when true. Default: true */
  get cancellable(): boolean {
    return this.#options.cancellable
  }

  set cancellable(cancellable: boolean) {
    this.update({ cancellable })
  }

  /** Add an "error" class to the div.progress-item element */
  get error(): boolean {
    return this.#options.error
  }

  set error(error: boolean) {
    this.update({ error })
  }

  /** Can this item be paused? Shows pause button when true. Default: false */
  get pauseable(): boolean {
    return this.#options.pauseable
  }

  set pauseable(pauseable: boolean) {
    this.update({ pauseable })
  }

  /** Is this item currently paused? Setting this emits a 'paused' event. */
  get paused(): boolean {
    return this.#paused
  }

  set paused(value: boolean) {
    if (this.#paused === value) return
    this.#paused = value
    this.emit('paused', value)
  }

  /** Automatically mark as completed when value reaches maxValue. Default: true */
  get completeAutomatically(): boolean {
    return this.#options.completeAutomatically
  }

  set completeAutomatically(completeAutomatically: boolean) {
    this.update({ completeAutomatically })
  }

  /** Automatically remove from window when completed. Default: true */
  get autoRemove(): boolean {
    return this.#options.autoRemove
  }

  set autoRemove(autoRemove: boolean) {
    this.update({ autoRemove })
  }

  /**
   * Should this item be shown initially?
   * If false, it will be hidden until you call show().
   *
   * Default: true
   */
  get initiallyVisible(): boolean {
    return this.#options.initiallyVisible
  }

  /**
   * Delay showing the indeterminate progress bar until this many milliseconds have passed.
   * This is useful to avoid showing the progress bar for items that complete quickly. Ignored
   * for determinate items.
   *
   * Default: 0 (show immediately)
   */
  get delayIndeterminateMs(): number {
    return this.#options.delayIndeterminateMs || 0
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
    return this.#options.showWhenEstimateExceedsMs || 0
  }

  /**
   * Custom identifier for this progress item.
   * If provided during construction, this will be used as the id.
   * Otherwise, a random id is generated.
   *
   * This identifier is rendered as both the HTML id attribute and data-testid attribute
   * on the .progress-item element, making it easy to target specific items in tests.
   */
  get identifier(): string | undefined {
    return this.#options.identifier
  }

  /** Is this item completed? */
  get completed(): boolean {
    return this.#completed
  }

  /** Is this item still in progress (not completed)? */
  get inProgress(): boolean {
    return !this.#completed
  }

  /** Is this item currently visible in the window? */
  get visible(): boolean {
    return !this.removed && !!this.#visible
  }

  /** Get the estimated total time based on current progress */
  getEstimatedTotalTime(): number | undefined {
    if (this.indeterminate) return undefined
    if (this.value === 0) return undefined
    if (this.value >= this.maxValue) return undefined
    if (this.#startTime === null) return undefined
    const elapsed = Date.now() - this.#startTime
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
    const hasChanged = Object.entries(options).some(([key, val]) => {
      const optionKey = key as keyof ProgressItemOptions
      return !deepEqual(this.#options[optionKey], val)
    })
    // if none of the options have changed, return
    if (!hasChanged) {
      return
    }
    this.#options = { ...this.#options, ...options }
    this.emit('update')
    // if we're not visible and the estimated time remaining is greater than the threshold, show
    const estimatedTime = this.getEstimatedTotalTime()
    if (
      !this.visible &&
      estimatedTime !== undefined &&
      estimatedTime > this.showWhenEstimateExceedsMs
    ) {
      this.show()
    }
    if (
      !this.completed &&
      this.completeAutomatically &&
      this.#options.value >= this.maxValue
    ) {
      this.complete()
    }
  }

  /**
   * Mark the progress item as completed.
   * Automatically sets value to maxValue.
   * If autoRemove is true, the item will be removed.
   */
  complete() {
    if (this.completed || this.removed) {
      return
    }
    this.clearVisibilityTimeout()
    this.#options.value = this.maxValue
    this.#completed = true
    this.emit('complete')
    if (this.autoRemove) {
      this.remove()
    }
  }

  /** Remove the ProgressItem from the ProgressWindow */
  remove() {
    this.clearVisibilityTimeout()
    this.removed = true
    this.emit('remove')
  }

  /** Cancel the ProgressItem */
  cancel() {
    if (this.cancelled || this.removed) {
      return
    }
    this.clearVisibilityTimeout()
    const event = new CancelableEvent('willCancel')
    this.emit('willCancel', event)
    if (event.defaultPrevented) {
      return
    }
    this.cancelled = true
    this.emit('cancelled')
    this.remove()
  }

  /** Show the ProgressItem */
  show() {
    // istanbul ignore if
    if (this.#visible === true) {
      return
    }
    this.#visible = true
    this.emit('show')
  }

  /** Hide the ProgressItem */
  hide() {
    if (this.#visible === false) {
      return
    }
    this.#visible = false
    this.emit('hide')
  }

  /** Get a transferable object for IPC - @internal */
  transferable(): ProgressItemTransferable {
    return {
      id: this.id,
      title: this.title,
      detail: this.detail,
      value: this.value,
      maxValue: this.maxValue,
      indeterminate: this.indeterminate,
      theme: this.theme,
      error: this.error,
      cancellable: this.cancellable,
      pauseable: this.pauseable,
      completeAutomatically: this.completeAutomatically,
      autoRemove: this.autoRemove,
      paused: this.paused,
      cancelled: this.cancelled,
      completed: this.completed,
      visible: this.#visible,
      cssVars: this.cssTransferable,
    }
  }
}

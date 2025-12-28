import { ipcRenderer, contextBridge } from 'electron'

// Type definition for timer button click payload
interface TimerButtonClickPayload {
  identifier?: string
  title?: string
  time: number
  indeterminate?: boolean
  persist?: boolean
  description?: boolean
  descriptionText?: string
  enablePause?: boolean
  enableCancel?: boolean
  error?: boolean
  theme?: string
  cssCustom?: boolean
}

/**
 * Validates and sends a timer button click event to the main process.
 * This function validates all inputs to prevent injection attacks.
 */
function sendTimerButtonClick(payload: TimerButtonClickPayload): void {
  if (!payload || typeof payload !== 'object') {
    console.error('Invalid payload: must be an object')
    return
  }

  const { time, identifier, title, indeterminate, persist, description, descriptionText, enablePause, enableCancel, error, theme, cssCustom } = payload

  // Validate required time parameter
  if (typeof time !== 'number' || !Number.isFinite(time) || time < 0) {
    console.error('Invalid time: must be a positive number')
    return
  }

  // Send validated payload to main process
  ipcRenderer.send('timer-button-click', {
    identifier: typeof identifier === 'string' ? identifier : undefined,
    title: typeof title === 'string' ? title : undefined,
    time,
    indeterminate: Boolean(indeterminate),
    persist: Boolean(persist),
    description: Boolean(description),
    descriptionText: typeof descriptionText === 'string' ? descriptionText : undefined,
    enablePause: enablePause !== false,
    enableCancel: enableCancel !== false,
    error: Boolean(error),
    theme: typeof theme === 'string' ? theme : undefined,
    cssCustom: Boolean(cssCustom),
  })
}

// Expose a restricted, validated API to the window object
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Send a validated timer button click event to the main process.
   * Only this specific validated method is exposed, not a generic send function.
   */
  sendTimerButtonClick,
})

function init() {
  console.log('preload script init()')
  document.body.addEventListener('click', (event) => {
    console.log('click event')
    if (event.target instanceof HTMLAnchorElement) {
      event.preventDefault()
      ipcRenderer.send('open-url', event.target.href)
    }
    // handle .timer button clicks
    if (event.target instanceof HTMLButtonElement) {
      console.log('button click')
      const el = event.target
      if (el.matches('.timer')) {
        console.log('timer button clicked')
        const timeString = el.dataset.time
        const indeterminate = el.dataset.indeterminate === 'true'
        const persist = el.dataset.persist === 'true'
        const title = el.dataset.title
        const description = el.dataset.description
        const descriptionText = el.dataset.descriptionText
        const enablePause =
          !el.dataset.pauseable || el.dataset.pauseable !== 'false'
        const enableCancel =
          !el.dataset.cancellable || el.dataset.cancellable !== 'false'
        const error = el.dataset.error === 'true'
        const theme = el.dataset.theme
        const cssCustom = el.dataset.cssCustom === 'true'
        const time = parseInt(timeString, 10)

        // Use the validated send function
        sendTimerButtonClick({
          time,
          indeterminate,
          persist,
          title,
          description: description === 'true',
          descriptionText,
          enablePause,
          enableCancel,
          error,
          theme,
          cssCustom,
        })
      }
    }
  })
}

document.addEventListener('DOMContentLoaded', init)

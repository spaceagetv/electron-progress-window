import { ipcMain } from 'electron'
import { ProgressWindow, ProgressItemOptions } from 'electron-progress-window'

ProgressWindow.configure({
  closeOnComplete: true,
  itemDefaults: {
    pauseable: true,
  },
  // css: `
  //   body {
  //     background-color: #fce2a9;
  //   }
  //   .progress-item {
  //     border: 1px solid #444;
  //   }
  // `,
  windowOptions: {
    height: 50,
    width: 500,
    title: 'Progress Window',
  },
})

ProgressWindow.staticEvents.on('created', (progressWindow) => {
  console.log('created', progressWindow.options.windowOptions?.title)
  // progressWindow.browserWindow?.webContents.openDevTools({ mode: 'detach' })
})

ipcMain.on(
  'timer-button-click',
  async (
    event,
    {
      time,
      indeterminate,
      persist,
      description,
      title,
      descriptionText,
      enablePause,
      enableCancel,
      error,
      theme,
      cssCustom,
      identifier,
    }
  ) => {
    // console.log({
    //   time,
    //   indeterminate,
    //   persist,
    //   description,
    //   title,
    //   descriptionText,
    //   enablePause,
    //   enableCancel,
    // })
    title =
      title ||
      `${time} seconds` +
        (indeterminate ? ' (indeterminate)' : '') +
        (persist ? ' (persist)' : '')
    const desc = descriptionText
      ? // if there's a descriptionText, use it
        descriptionText
      : description
      ? // otherwise, if there's a description, enable the detail field
        `0% complete`
      : undefined
    const options: Partial<ProgressItemOptions> = {
      title,
      detail: desc,
      indeterminate,
      maxValue: 1,
      autoRemove: !persist,
      pauseable: enablePause,
      cancellable: enableCancel,
      identifier, // Pass through the custom identifier if provided
    }

    // Add theme if specified
    if (theme) {
      options.theme = theme as 'stripes'
    }

    // Add custom CSS if requested
    if (cssCustom) {
      options.cssVars = {
        progressForeground: '#ff6b6b',
        itemBackground: '#4ecdc4',
        textColor: '#ffffff',
      }
    }

    const progressItem = await ProgressWindow.addItem(options)
    const handle = runTimer(time * 1000, (progressValue, finished) => {
      let detail: string | undefined
      if (descriptionText) {
        detail = descriptionText
      } else if (description) {
        detail = `${Math.round(progressValue * 100)}% complete`
      }
      progressItem.value = progressValue
      if (detail !== undefined) {
        progressItem.detail = detail
      }

      // Trigger error state halfway through if error flag is set
      if (error && progressValue >= 0.5 && progressValue < 0.6) {
        progressItem.error = true
      }

      if (finished && indeterminate) {
        progressItem.complete()
      }
    })
    progressItem.on('cancelled', () => {
      handle.cancel()
    })
    progressItem.on('remove', () => {
      handle.cancel()
    })
    progressItem.on('paused', (isPaused: boolean) => {
      if (isPaused) {
        handle.pause()
      } else {
        handle.resume()
      }
    })
  }
)

/**
 * Run a timer for the given time and call the callback with the progress value
 * @param time - time in milliseconds
 * @param progressCallback - callback to be called with progress value
 * @returns handle with pause, resume, and cancel methods
 */
function runTimer(
  time: number,
  progressCallback: (progress: number, finished?: boolean) => void
) {
  let elapsed = 0
  let interval: NodeJS.Timeout
  const startTimer = () => {
    interval = setInterval(() => {
      elapsed += 100
      const progress = elapsed / time
      progressCallback(progress, elapsed >= time)
      if (elapsed >= time) {
        clearInterval(interval)
      }
    }, 100)
  }
  startTimer()
  const pause = () => {
    clearInterval(interval)
  }
  const resume = () => {
    startTimer()
  }
  const cancel = pause
  return { pause, resume, cancel }
}

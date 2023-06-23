import { ipcMain } from 'electron'
import { ProgressWindow } from 'electron-progress-window'

ProgressWindow.configure({
  closeOnComplete: true,
  itemDefaults: {
    enablePause: true,
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

ProgressWindow.emitter.on('created', (_progressWindow) => {
  console.log('created')
  // _progressWindow.browserWindow.webContents.openDevTools({ mode: 'detach' })
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
    const progressItem = await ProgressWindow.addItem({
      title,
      detail: desc,
      indeterminate,
      maxValue: 1,
      removeOnComplete: !persist,
      enablePause,
      enableCancel,
    })
    const handle = runTimer(time * 1000, (progressValue, finished) => {
      let detail: string | undefined
      if (descriptionText) {
        detail = descriptionText
      } else if (description) {
        detail = `${Math.round(progressValue * 100)}% complete`
      }
      progressItem.setProgress(progressValue, { detail })
      if (finished && indeterminate) {
        progressItem.setCompleted()
      }
    })
    progressItem.on('cancelled', () => {
      handle.cancel()
    })
    progressItem.on('remove', () => {
      handle.cancel()
    })
    progressItem.on('pause', (bool: boolean) => {
      if (bool) {
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

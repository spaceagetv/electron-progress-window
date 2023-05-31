import { ipcRenderer } from 'electron'
import { ProgressItemOptions } from 'electron-progress-window'

type Timer = {
  /** ms */
  time: number
}

const els = {
  titleInput: () => document.getElementById('title-input') as HTMLInputElement,
  detailInput: () =>
    document.getElementById('detail-input') as HTMLInputElement,
  secondsInput: () =>
    document.getElementById('seconds-input') as HTMLInputElement,
  indeterminateInput: () =>
    document.getElementById('indeterminate-input') as HTMLInputElement,
  removeInput: () =>
    document.getElementById('remove-input') as HTMLInputElement,
  cancelInput: () =>
    document.getElementById('cancel-input') as HTMLInputElement,
  pauseInput: () => document.getElementById('pause-input') as HTMLInputElement,
}

function progressSettings() {
  const options: ProgressItemOptions = {
    title: els.titleInput().value,
    detail: els.detailInput().value,
    indeterminate: els.indeterminateInput().checked,
    removeOnComplete: els.removeInput().checked,
    enableCancel: els.cancelInput().checked,
    enablePause: els.pauseInput().checked,
    autoComplete: els.removeInput().checked,
  }
  const timer: Timer = {
    time: parseInt(els.secondsInput().value || '10'),
  }
  return { options, timer }
}

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', (event) => {
    if (
      event.target instanceof HTMLButtonElement &&
      event.target.id === 'start'
    ) {
      const { options, timer } = progressSettings()
      ipcRenderer.send('add-progress-item', options, timer)
    }
  })
})

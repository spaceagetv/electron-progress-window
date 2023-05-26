import { ipcRenderer } from 'electron'

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
          !el.dataset.enablePause || el.dataset.enablePause === 'true'
        const enableCancel =
          !el.dataset.enableCancel || el.dataset.enableCancel === 'true'
        const time = parseInt(timeString, 10)
        ipcRenderer.send('timer-button-click', {
          time,
          indeterminate,
          persist,
          title,
          description,
          descriptionText,
          enablePause,
          enableCancel,
        })
      }
    }
  })
}

document.addEventListener('DOMContentLoaded', init)

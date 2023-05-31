// use require so that it works in the HTML with node enabled
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ipcRenderer } = require('electron')
import type { ProgressItemTransferable } from './ProgressItem'
// import { logger } from '../logger'

// logger.setLevel(LogLevel.DEBUG)

const progressItems: ProgressWidget[] = []

document.addEventListener('DOMContentLoaded', () => {
  // logger.log('DOMContentLoaded 👍')
  document.body.addEventListener('click', (event) => {
    // logger.debug('click event', event)
    // show me the constructor name of the clicked element
    if (event.target instanceof Element) {
      const el = event.target
      // logger.log('click event', el)
      const cancelEl = el.closest('.progress-item-cancel')
      if (cancelEl instanceof HTMLElement) {
        event.preventDefault()
        const progressItemId = cancelEl.dataset.itemId
        // logger.log('cancel progress item', progressItemId)
        ipcRenderer.send('progress-item-cancel', progressItemId)
        return
      }
      const pauseEl = el.closest('.progress-item-pause')
      if (pauseEl instanceof HTMLElement) {
        event.preventDefault()
        const progressItemId = pauseEl.dataset.itemId
        // logger.log('pause progress item', progressItemId)
        ipcRenderer.send('progress-item-pause', progressItemId)
      }
    }
  })
})

function getProgressWidget(id: string) {
  return progressItems.find((item) => item.id === id)
}

ipcRenderer.on(
  'progress-item-add',
  (event, progressItem: ProgressItemTransferable) => {
    // logger.log('progress-item-add', progressItem)
    const widget = new ProgressWidget(progressItem)
    progressItems.push(widget)
    const list = document.getElementById('progress-items')
    list.appendChild(widget.element)
    updateContentSize()
  }
)

ipcRenderer.on('progress-item-remove', (event, progressItemId: string) => {
  // logger.log('progress-item-remove', progressItemId)
  const widget = getProgressWidget(progressItemId)
  if (widget) {
    // remove from DOM
    widget.element.remove()
    progressItems.splice(progressItems.indexOf(widget), 1)
  }
  updateContentSize()
})

ipcRenderer.on(
  'progress-item-update',
  (event, progressItem: ProgressItemTransferable) => {
    // logger.silly('progress-item-update', progressItem)
    const widget = getProgressWidget(progressItem.id)
    if (widget) {
      widget.update(progressItem)
    }
  }
)

const lastDimensions = { width: 0, height: 0 }

function updateContentSize() {
  const list = document.getElementById('progress-items')
  // get the scrollable height and width the body with padding and margin
  const rect = list.getBoundingClientRect()
  const width = rect.width
  const height = rect.height
  if (width === lastDimensions.width && height === lastDimensions.height) {
    return
  }
  lastDimensions.width = width
  lastDimensions.height = height
  ipcRenderer.send('progress-update-content-size', { width, height })
}

const pauseSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
</svg>
`

const resumeSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M8 5v14l11-7z"/>
</svg>
`

const cancelSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M19 5.41L17.59 4 12 9.59 6.41 4 5 5.41 10.59 11 5 16.59 6.41 18 12 12.41 17.59 18 19 16.59 13.41 11z"/>
</svg>
`

class ProgressWidget {
  id: string
  element: HTMLDivElement
  cancelElement: HTMLSpanElement
  pauseElement: HTMLSpanElement
  titleElement: HTMLDivElement
  progressElement: HTMLProgressElement
  detailElement: HTMLDivElement
  item: ProgressItemTransferable

  constructor(item: ProgressItemTransferable) {
    this.id = item.id
    this.item = item
    this.element = document.createElement('div')
    this.element.className = 'progress-item'
    this.element.id = item.id
    this.element.innerHTML = `
      <div class="progress-item-actions">
        ${
          item.enablePause
            ? '<span class="progress-item-pause" data-item-id=' +
              this.id +
              '>' +
              pauseSvg +
              '</span>'
            : ''
        }
        ${
          item.enableCancel
            ? '<span class="progress-item-cancel" data-item-id=' +
              this.id +
              '>' +
              cancelSvg +
              '</span>'
            : ''
        }
      </div>
      <div class="progress-item-title">${item.title}</div>
      <progress class="progress-item-progress"></progress>
      <div class="progress-item-detail">${item.detail}</div>
    `
    this.element.classList.toggle('paused', item.paused)
    this.progressElement = this.element.querySelector(
      '.progress-item-progress'
    ) as HTMLProgressElement
    if (!item.indeterminate) {
      this.progressElement.value = item.value
      this.progressElement.max = item.maxValue
    }
    this.cancelElement = this.element.querySelector(
      '.progress-item-cancel'
    ) as HTMLSpanElement
    this.pauseElement = this.element.querySelector(
      '.progress-item-pause'
    ) as HTMLSpanElement
    this.titleElement = this.element.querySelector(
      '.progress-item-title'
    ) as HTMLDivElement
    this.detailElement = this.element.querySelector(
      '.progress-item-detail'
    ) as HTMLDivElement
    // logger.log('ProgressWidget created', this)
  }

  update(item: ProgressItemTransferable) {
    const oldItem = this.item
    this.item = item
    if (!item.indeterminate) {
      this.progressElement.value = item.value
      this.progressElement.max = item.maxValue
    } else {
      this.progressElement.removeAttribute('value')
      this.progressElement.removeAttribute('max')
    }
    this.titleElement.innerText = item.title
    this.detailElement.innerText = item.detail
    if (item.enablePause && oldItem.paused !== item.paused) {
      this.element.classList.toggle('paused', item.paused)
      if (item.paused) {
        this.pauseElement.innerHTML = resumeSvg
      } else {
        this.pauseElement.innerHTML = pauseSvg
      }
    }
  }
}

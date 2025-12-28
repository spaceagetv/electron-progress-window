/**
 * Renderer process code for the ProgressWindow.
 *
 * This runs in the browser context with contextIsolation enabled.
 * It accesses IPC via the progressWindowAPI exposed by the preload script.
 *
 * @internal
 */
import type { ProgressItemTransferable } from './ProgressItem'
import type { ProgressWindowAPI } from './preload'

// Access the API exposed by the preload script
declare global {
  interface Window {
    progressWindowAPI: ProgressWindowAPI
  }
}

const progressItems: ProgressWidget[] = []

document.addEventListener('DOMContentLoaded', () => {
  window.name = 'electron-progress-window'

  // Set up click handlers for cancel and pause buttons
  document.body.addEventListener('click', (event) => {
    if (event.target instanceof Element) {
      const el = event.target

      const cancelEl = el.closest('.progress-item-cancel')
      if (cancelEl instanceof HTMLElement) {
        event.preventDefault()
        const progressItemId = cancelEl.dataset.itemId
        if (progressItemId) {
          window.progressWindowAPI.cancelItem(progressItemId)
        }
        return
      }

      const pauseEl = el.closest('.progress-item-pause')
      if (pauseEl instanceof HTMLElement) {
        event.preventDefault()
        const progressItemId = pauseEl.dataset.itemId
        if (progressItemId) {
          window.progressWindowAPI.togglePauseItem(progressItemId)
        }
      }
    }
  })

  // Set up IPC listeners via the exposed API
  window.progressWindowAPI.onItemAdd(
    (progressItem: ProgressItemTransferable) => {
      const widget = new ProgressWidget(progressItem)
      progressItems.push(widget)
      const list = document.getElementById('progress-items')
      if (list) {
        list.appendChild(widget.element)
        // Scroll the newly added item into view
        widget.element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
      updateContentSize()
    }
  )

  window.progressWindowAPI.onItemRemove((progressItemId: string) => {
    const widget = getProgressWidget(progressItemId)
    if (widget) {
      widget.element.remove()
      progressItems.splice(progressItems.indexOf(widget), 1)
    }
    updateContentSize()
  })

  window.progressWindowAPI.onItemUpdate(
    (progressItem: ProgressItemTransferable) => {
      const widget = getProgressWidget(progressItem.id)
      if (widget) {
        widget.update(progressItem)
      }
      updateContentSize()
    }
  )
})

function getProgressWidget(id: string) {
  return progressItems.find((item) => item.id === id)
}

const lastDimensions = { width: 0, height: 0 }

function updateContentSize() {
  const list = document.getElementById('progress-items')
  if (!list) return

  const rect = list.getBoundingClientRect()
  const width = rect.width
  const height = rect.height

  if (width === lastDimensions.width && height === lastDimensions.height) {
    return
  }

  lastDimensions.width = width
  lastDimensions.height = height
  window.progressWindowAPI.updateContentSize({ width, height })
}

const PAUSE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
</svg>
`

const RESUME_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M8 5v14l11-7z"/>
</svg>
`

const CANCEL_SVG = `
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
  progressElement: HTMLDivElement
  progressIndicator: HTMLDivElement
  detailElement: HTMLDivElement
  item = {} as ProgressItemTransferable

  constructor(item: ProgressItemTransferable) {
    this.id = item.id
    this.item = item
    this.element = document.createElement('div')
    this.element.className = 'progress-item'
    this.element.id = item.id
    // Also set data-testid for easier test targeting
    this.element.dataset.testid = item.id
    this.element.innerHTML = `
      <div class="progress-item-actions">
        <span class="progress-item-pause" data-item-id="${this.id}">${PAUSE_SVG}</span>
        <span class="progress-item-cancel" data-item-id="${this.id}">${CANCEL_SVG}</span>
      </div>
      <div class="progress-item-title"></div>
      <div class="progress-item-progress">
        <div class="progress-item-indicator">
          <span></span>
        </div>
      </div>
      <div class="progress-item-detail"></div>
    `
    this.progressElement = this.element.querySelector(
      '.progress-item-progress'
    ) as HTMLDivElement
    this.progressIndicator = this.element.querySelector(
      '.progress-item-indicator'
    ) as HTMLDivElement
    this.cancelElement = this.element.querySelector(
      '.progress-item-cancel'
    ) as HTMLSpanElement
    this.pauseElement = this.element.querySelector(
      '.progress-item-pause'
    ) as HTMLSpanElement
    this.titleElement = this.element.querySelector(
      '.progress-item-title'
    ) as HTMLDivElement
    // Set title immediately to avoid extra DOM update
    // Use textContent for security - prevents XSS
    this.titleElement.textContent = item.title
    this.detailElement = this.element.querySelector(
      '.progress-item-detail'
    ) as HTMLDivElement
    // Set detail immediately to avoid extra DOM update
    // Use textContent for security - prevents XSS
    this.detailElement.textContent = item.detail
    this.update(item, true)
  }

  update(item: ProgressItemTransferable, force = false) {
    const oldItem = this.item
    this.item = item
    this.element.classList.toggle(
      'complete-automatically',
      item.completeAutomatically
    )
    this.element.classList.toggle('cancelled', item.cancelled)
    this.element.classList.toggle('completed', item.completed)
    this.element.classList.toggle('cancellable', item.cancellable)
    this.element.classList.toggle('pauseable', item.pauseable)
    this.element.classList.toggle('error', item.error)
    this.element.classList.toggle('paused', item.paused)
    this.element.classList.toggle('indeterminate', item.indeterminate)
    this.element.classList.toggle('auto-remove', item.autoRemove)
    this.element.classList.toggle('stripes', item.theme === 'stripes')

    item.cssVars.forEach(([prop, val]) => {
      this.element.style.setProperty(prop, val)
    })

    if (oldItem.value !== item.value || force) {
      this.element.style.setProperty(
        '--progress-value',
        (item.value / item.maxValue) * 100 + '%'
      )
    }

    if (oldItem.title !== item.title || force) {
      // Use textContent for security - prevents XSS
      this.titleElement.textContent = item.title
    }

    if (oldItem.detail !== item.detail || force) {
      // Use textContent for security - prevents XSS
      this.detailElement.textContent = item.detail
    }

    if (oldItem.paused !== item.paused || force) {
      if (item.paused) {
        this.pauseElement.innerHTML = RESUME_SVG
      } else {
        this.pauseElement.innerHTML = PAUSE_SVG
      }
    }
  }
}

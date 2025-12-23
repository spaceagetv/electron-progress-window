/**
 * Preload script for the ProgressWindow renderer process.
 *
 * This script runs in a privileged context with access to Node.js APIs,
 * but exposes only a limited, safe API to the renderer via contextBridge.
 *
 * @internal
 */
import { contextBridge, ipcRenderer } from 'electron'
import type { ProgressItemTransferable } from './ProgressItem'

/**
 * The API exposed to the renderer process via window.progressWindowAPI
 * @internal
 */
export interface ProgressWindowAPI {
  /**
   * Send a cancel request for a progress item
   */
  cancelItem: (itemId: string) => void

  /**
   * Send a pause toggle request for a progress item
   */
  togglePauseItem: (itemId: string) => void

  /**
   * Send the content size to the main process for window resizing
   */
  updateContentSize: (dimensions: { width: number; height: number }) => void

  /**
   * Register a callback for when a progress item is added
   */
  onItemAdd: (callback: (item: ProgressItemTransferable) => void) => void

  /**
   * Register a callback for when a progress item is updated
   */
  onItemUpdate: (callback: (item: ProgressItemTransferable) => void) => void

  /**
   * Register a callback for when a progress item is removed
   */
  onItemRemove: (callback: (itemId: string) => void) => void
}

// Expose a limited API to the renderer process
contextBridge.exposeInMainWorld('progressWindowAPI', {
  cancelItem: (itemId: string) => {
    ipcRenderer.send('progress-item-cancel', itemId)
  },

  togglePauseItem: (itemId: string) => {
    ipcRenderer.send('progress-item-pause', itemId)
  },

  updateContentSize: (dimensions: { width: number; height: number }) => {
    ipcRenderer.send('progress-update-content-size', dimensions)
  },

  onItemAdd: (callback: (item: ProgressItemTransferable) => void) => {
    ipcRenderer.on('progress-item-add', (_event, item) => callback(item))
  },

  onItemUpdate: (callback: (item: ProgressItemTransferable) => void) => {
    ipcRenderer.on('progress-item-update', (_event, item) => callback(item))
  },

  onItemRemove: (callback: (itemId: string) => void) => {
    ipcRenderer.on('progress-item-remove', (_event, itemId) => callback(itemId))
  },
} satisfies ProgressWindowAPI)

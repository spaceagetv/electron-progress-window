/**
 * Preload script for the ProgressWindow renderer process.
 *
 * This script runs in a privileged context with access to Node.js APIs,
 * but exposes only a limited, safe API to the renderer via contextBridge.
 *
 * @internal
 */
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
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
   * Register a callback for when a progress item is added.
   * Only one listener is active at a time - subsequent calls replace the previous listener.
   */
  onItemAdd: (callback: (item: ProgressItemTransferable) => void) => void

  /**
   * Register a callback for when a progress item is updated.
   * Only one listener is active at a time - subsequent calls replace the previous listener.
   */
  onItemUpdate: (callback: (item: ProgressItemTransferable) => void) => void

  /**
   * Register a callback for when a progress item is removed.
   * Only one listener is active at a time - subsequent calls replace the previous listener.
   */
  onItemRemove: (callback: (itemId: string) => void) => void
}

// Store listener references to allow cleanup and prevent memory leaks.
// Each on* method replaces any existing listener for that event.
type IpcListener = (event: IpcRendererEvent, ...args: unknown[]) => void
const listeners: Record<string, IpcListener> = {}

/**
 * Register an IPC listener, removing any existing listener for the same channel.
 * This prevents memory leaks from multiple registrations.
 */
function setListener(channel: string, listener: IpcListener): void {
  // Remove existing listener if present
  if (listeners[channel]) {
    ipcRenderer.removeListener(channel, listeners[channel])
  }
  // Store and register the new listener
  listeners[channel] = listener
  ipcRenderer.on(channel, listener)
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
    setListener('progress-item-add', (_event, item) =>
      callback(item as ProgressItemTransferable)
    )
  },

  onItemUpdate: (callback: (item: ProgressItemTransferable) => void) => {
    setListener('progress-item-update', (_event, item) =>
      callback(item as ProgressItemTransferable)
    )
  },

  onItemRemove: (callback: (itemId: string) => void) => {
    setListener('progress-item-remove', (_event, itemId) =>
      callback(itemId as string)
    )
  },
} satisfies ProgressWindowAPI)

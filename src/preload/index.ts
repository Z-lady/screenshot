import { contextBridge, ipcRenderer } from 'electron'
import type {
  OverlayInitPayload,
  ScreenshotCompletePayload
} from '../shared/types'

const api = {
  start: (): Promise<{ provider: string }> =>
    ipcRenderer.invoke('screenshot:start'),

  getInit: (): Promise<OverlayInitPayload> =>
    ipcRenderer.invoke('screenshot:get-init'),

  complete: (
    payload: ScreenshotCompletePayload
  ): Promise<void> =>
    ipcRenderer.invoke('screenshot:complete', payload),

  cancel: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke('screenshot:cancel', sessionId),

  onCompleted: (
    callback: (payload: {
      dataUrl: string
      displayId: string
    }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: { dataUrl: string; displayId: string }
    ) => callback(payload)

    ipcRenderer.on('screenshot:completed', handler)

    return () => {
      ipcRenderer.removeListener('screenshot:completed', handler)
    }
  }
}

contextBridge.exposeInMainWorld('screenshotApi', api)

import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import {
  BrowserWindow,
  clipboard,
  ipcMain,
  nativeImage,
  screen,
  type WebContents
} from 'electron'
import type { CaptureProvider } from './CaptureProvider'
import type {
  OverlayInitPayload,
  ScreenshotCompletePayload
} from '../../shared/types'

interface OverlayRecord {
  window: BrowserWindow
  init: OverlayInitPayload
}

interface ActiveSession {
  id: string
  overlays: Map<number, OverlayRecord>
  completed: boolean
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

export class ScreenshotManager {
  private active: ActiveSession | null = null

  constructor(
    private readonly mainWindow: BrowserWindow,
    private readonly provider: CaptureProvider
  ) {}

  registerIpc(): void {
    for (const channel of [
      'screenshot:start',
      'screenshot:get-init',
      'screenshot:complete',
      'screenshot:cancel'
    ]) {
      ipcMain.removeHandler(channel)
    }

    ipcMain.handle('screenshot:start', async () => {
      await this.start()
      return { provider: this.provider.name }
    })

    ipcMain.handle('screenshot:get-init', (event) => {
      return this.getInit(event.sender)
    })

    ipcMain.handle(
      'screenshot:complete',
      async (event, payload: ScreenshotCompletePayload) => {
        await this.complete(event.sender, payload)
      }
    )

    ipcMain.handle('screenshot:cancel', async (event, sessionId: string) => {
      await this.cancel(event.sender, sessionId)
    })
  }

  async start(): Promise<void> {
    if (this.active) {
      for (const { window } of this.active.overlays.values()) {
        if (!window.isDestroyed()) {
          window.show()
        }
      }
      return
    }

    const displays = screen.getAllDisplays()

    this.mainWindow.hide()

    // Give the compositor a short moment to remove our main window from capture.
    await sleep(140)

    try {
      const frames = await this.provider.captureDisplays(displays)
      const sessionId = randomUUID()

      const session: ActiveSession = {
        id: sessionId,
        overlays: new Map(),
        completed: false
      }

      this.active = session

      for (const frame of frames) {
        const display = displays.find(
          (item) => String(item.id) === frame.display.id
        )

        if (!display) {
          continue
        }

        const overlay = new BrowserWindow({
          x: display.bounds.x,
          y: display.bounds.y,
          width: display.bounds.width,
          height: display.bounds.height,
          frame: false,
          transparent: false,
          backgroundColor: '#000000',
          alwaysOnTop: true,
          skipTaskbar: true,
          resizable: false,
          movable: false,
          minimizable: false,
          maximizable: false,
          fullscreenable: false,
          show: false,
          autoHideMenuBar: true,
          webPreferences: {
            preload: join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
          }
        })

        const init: OverlayInitPayload = {
          ...frame,
          sessionId
        }

        session.overlays.set(overlay.webContents.id, {
          window: overlay,
          init
        })

        overlay.on('closed', () => {
          session.overlays.delete(overlay.webContents.id)

          if (
            this.active?.id === sessionId &&
            session.overlays.size === 0 &&
            !session.completed
          ) {
            this.active = null
            this.restoreMainWindow()
          }
        })

        await overlay.loadFile(join(__dirname, 'index.html'), {
          query: {
            mode: 'screenshot',
            displayId: frame.display.id
          }
        })

        overlay.show()
      }

      const cursor = screen.getCursorScreenPoint()
      const cursorDisplay = screen.getDisplayNearestPoint(cursor)
      const preferred = [...session.overlays.values()].find(
        ({ init }) => init.display.id === String(cursorDisplay.id)
      )

      preferred?.window.focus()
    } catch (error) {
      await this.closeAllOverlays()
      this.active = null
      this.restoreMainWindow()
      throw error
    }
  }

  private getInit(sender: WebContents): OverlayInitPayload {
    const record = this.active?.overlays.get(sender.id)

    if (!record) {
      throw new Error('No screenshot session is attached to this overlay.')
    }

    return record.init
  }

  private async complete(
    sender: WebContents,
    payload: ScreenshotCompletePayload
  ): Promise<void> {
    const active = this.active
    const record = active?.overlays.get(sender.id)

    if (
      !active ||
      !record ||
      active.id !== payload.sessionId ||
      record.init.display.id !== payload.displayId
    ) {
      throw new Error('Invalid screenshot session.')
    }

    const image = nativeImage.createFromDataURL(payload.dataUrl)

    if (image.isEmpty()) {
      throw new Error('Screenshot result is empty.')
    }

    clipboard.writeImage(image)

    active.completed = true

    this.mainWindow.webContents.send('screenshot:completed', {
      dataUrl: payload.dataUrl,
      displayId: payload.displayId
    })

    await this.closeAllOverlays()
    this.active = null
    this.restoreMainWindow()
  }

  private async cancel(
    sender: WebContents,
    sessionId: string
  ): Promise<void> {
    const active = this.active

    if (
      !active ||
      active.id !== sessionId ||
      !active.overlays.has(sender.id)
    ) {
      return
    }

    await this.closeAllOverlays()
    this.active = null
    this.restoreMainWindow()
  }

  private async closeAllOverlays(): Promise<void> {
    const active = this.active
    if (!active) return

    const windows = [...active.overlays.values()].map(
      ({ window }) => window
    )

    active.overlays.clear()

    for (const window of windows) {
      if (!window.isDestroyed()) {
        window.close()
      }
    }
  }

  private restoreMainWindow(): void {
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.show()
      this.mainWindow.focus()
    }
  }
}

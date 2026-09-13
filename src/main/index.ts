import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'
import { env } from './config/env'
import { ElectronDesktopCaptureProvider } from './screenshot/ElectronDesktopCaptureProvider'
import { NativeHelperCaptureProvider } from './screenshot/NativeHelperCaptureProvider'
import { ScreenshotManager } from './screenshot/ScreenshotManager'

let mainWindow: BrowserWindow | null = null
let screenshotManager: ScreenshotManager | null = null

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1080,
    height: 760,
    minWidth: 820,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Electron Screenshot v1.1 Test',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  win.once('ready-to-show', () => win.show())
  void win.loadFile(join(__dirname, 'index.html'))

  const provider = env.SCREENSHOT_PROVIDER === 'native'
    ? new NativeHelperCaptureProvider()
    : new ElectronDesktopCaptureProvider()

  screenshotManager = new ScreenshotManager(win, provider)
  screenshotManager.registerIpc()

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null
      screenshotManager = null
    }
  })

  return win
}

app.whenReady().then(() => {
  mainWindow = createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

import { app, BrowserView, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null
let browserView: BrowserView | null = null
let toolbarHeight = 116
let currentOpacity = 0.9
let isDraggingWindow = false
const WINDOW_WIDTH = 520
const WINDOW_HEIGHT = 760

type NavState = {
  url: string
  title: string
  canGoBack: boolean
  canGoForward: boolean
  isLoading: boolean
}

const defaultUrl = 'https://chatgpt.com/'

function normalizeUrl(input: string): string {
  const value = input.trim()
  if (!value) return defaultUrl
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

function getNavState(): NavState {
  if (!browserView) {
    return { url: '', title: '', canGoBack: false, canGoForward: false, isLoading: false }
  }

  const viewContents = browserView.webContents
  return {
    url: viewContents.getURL() || '',
    title: viewContents.getTitle() || '',
    canGoBack: viewContents.canGoBack(),
    canGoForward: viewContents.canGoForward(),
    isLoading: viewContents.isLoading(),
  }
}

function emitNavState(): void {
  if (!mainWindow) return
  mainWindow.webContents.send('browser:navigation-state', getNavState())
}

function updateBrowserBounds(): void {
  if (!mainWindow || !browserView) return
  const [width, height] = mainWindow.getContentSize()
  const topInset = Math.max(72, Math.min(220, Math.round(toolbarHeight)))
  browserView.setBounds({
    x: 0,
    y: topInset,
    width,
    height: Math.max(0, height - topInset),
  })
  browserView.setAutoResize({ width: false, height: false })
}

function createBrowserView(): void {
  if (!mainWindow) return

  browserView = new BrowserView({
    webPreferences: {
      partition: 'persist:mini-private-browser',
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  mainWindow.setBrowserView(browserView)
  updateBrowserBounds()

  const viewContents = browserView.webContents
  viewContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url).catch(() => {})
    return { action: 'deny' }
  })
  viewContents.on('did-start-loading', emitNavState)
  viewContents.on('did-stop-loading', emitNavState)
  viewContents.on('did-navigate', emitNavState)
  viewContents.on('did-navigate-in-page', emitNavState)
  viewContents.on('page-title-updated', (event) => {
    event.preventDefault()
    emitNavState()
  })

  viewContents.loadURL(defaultUrl).catch(() => {})
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: 120,
    minHeight: 120,
    frame: false,
    transparent: false,
    backgroundColor: '#1a1a1a',
    alwaysOnTop: true,
    resizable: true,
    fullscreenable: false,
    minimizable: true,
    maximizable: false,
    skipTaskbar: true,
    thickFrame: false,
    hasShadow: false,

    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Invisibility during screen sharing
  mainWindow.setContentProtection(true)
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1)
  mainWindow.setOpacity(currentOpacity)
  mainWindow.setBackgroundColor('#0b1020')
  mainWindow.setMenu(null)

  // Prevent full screen but allow normal resizing
  mainWindow.on('enter-full-screen', () => {
    mainWindow?.setFullScreen(false)
  })

  // IMPORTANT: Update BrowserView bounds properly after resize
  mainWindow.on('resize', () => {
    updateBrowserBounds()
  })

  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.webContents.setZoomFactor(1)
  mainWindow.webContents.setVisualZoomLevelLimits(1, 1).catch(() => {})

  // Block unwanted zoom shortcuts
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const key = input.key.toLowerCase()
    const isZoomShortcut = input.control && (key === '+' || key === '-' || key === '0' || key === '=')
    if (isZoomShortcut) event.preventDefault()
  })

  mainWindow.webContents.on('did-finish-load', emitNavState)

  // Create BrowserView AFTER the window is ready
  createBrowserView()
}

app.whenReady().then(() => {
  ipcMain.handle('app:get-window-position', () => mainWindow?.getPosition() ?? [0, 0])
  ipcMain.on('app:move-window', (_event, x: number, y: number) => {
    mainWindow?.setPosition(Math.round(x), Math.round(y), false)
  })
  ipcMain.on('app:set-dragging', (_event, dragging: boolean) => {
    if (!mainWindow) return
    if (dragging === isDraggingWindow) return
    isDraggingWindow = dragging

    if (isDraggingWindow) {
      // Windows can render a "drag border/outline" on translucent/layered windows.
      // Temporarily switching to fully opaque avoids that visual artifact.
      mainWindow.setOpacity(1)
      return
    }

    mainWindow.setOpacity(currentOpacity)
  })
  ipcMain.handle('app:close-window', () => {
    mainWindow?.close()
  })
  ipcMain.handle('app:get-opacity', () => currentOpacity)
  ipcMain.on('app:set-opacity', (_event, nextOpacity: number) => {
    if (!Number.isFinite(nextOpacity)) return
    currentOpacity = Math.min(1, Math.max(0.3, nextOpacity))
    if (!isDraggingWindow) mainWindow?.setOpacity(currentOpacity)
  })
  ipcMain.on('app:set-toolbar-height', (_event, nextHeight: number) => {
    if (!Number.isFinite(nextHeight)) return
    toolbarHeight = nextHeight
    updateBrowserBounds()
  })
  ipcMain.handle('browser:navigate', (_event, rawUrl: string) => {
    browserView?.webContents.loadURL(normalizeUrl(rawUrl)).catch(() => {})
  })
  ipcMain.handle('browser:back', () => {
    if (browserView?.webContents.canGoBack()) browserView.webContents.goBack()
  })
  ipcMain.handle('browser:forward', () => {
    if (browserView?.webContents.canGoForward()) browserView.webContents.goForward()
  })
  ipcMain.handle('browser:reload', () => {
    browserView?.webContents.reload()
  })
  ipcMain.handle('browser:home', () => {
    browserView?.webContents.loadURL(defaultUrl).catch(() => {})
  })
  ipcMain.handle('browser:get-state', () => getNavState())

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

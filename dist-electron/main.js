import { app, ipcMain, BrowserWindow, BrowserView, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
let mainWindow = null;
let browserView = null;
let toolbarHeight = 116;
let currentOpacity = 0.9;
let isDraggingWindow = false;
const WINDOW_WIDTH = 520;
const WINDOW_HEIGHT = 760;
const defaultUrl = "https://chatgpt.com/";
function normalizeUrl(input) {
  const value = input.trim();
  if (!value) return defaultUrl;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}
function getNavState() {
  if (!browserView) {
    return { url: "", title: "", canGoBack: false, canGoForward: false, isLoading: false };
  }
  const viewContents = browserView.webContents;
  return {
    url: viewContents.getURL() || "",
    title: viewContents.getTitle() || "",
    canGoBack: viewContents.canGoBack(),
    canGoForward: viewContents.canGoForward(),
    isLoading: viewContents.isLoading()
  };
}
function emitNavState() {
  if (!mainWindow) return;
  mainWindow.webContents.send("browser:navigation-state", getNavState());
}
function updateBrowserBounds() {
  if (!mainWindow || !browserView) return;
  const [width, height] = mainWindow.getContentSize();
  const topInset = Math.max(72, Math.min(220, Math.round(toolbarHeight)));
  browserView.setBounds({
    x: 0,
    y: topInset,
    width,
    height: Math.max(0, height - topInset)
  });
  browserView.setAutoResize({ width: false, height: false });
}
function createBrowserView() {
  if (!mainWindow) return;
  browserView = new BrowserView({
    webPreferences: {
      partition: "persist:mini-private-browser",
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });
  mainWindow.setBrowserView(browserView);
  updateBrowserBounds();
  const viewContents = browserView.webContents;
  viewContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url).catch(() => {
    });
    return { action: "deny" };
  });
  viewContents.on("did-start-loading", emitNavState);
  viewContents.on("did-stop-loading", emitNavState);
  viewContents.on("did-navigate", emitNavState);
  viewContents.on("did-navigate-in-page", emitNavState);
  viewContents.on("page-title-updated", (event) => {
    event.preventDefault();
    emitNavState();
  });
  viewContents.loadURL(defaultUrl).catch(() => {
  });
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: 120,
    minHeight: 120,
    frame: false,
    transparent: false,
    backgroundColor: "#1a1a1a",
    alwaysOnTop: true,
    resizable: true,
    fullscreenable: false,
    minimizable: true,
    maximizable: false,
    skipTaskbar: true,
    thickFrame: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  mainWindow.setContentProtection(true);
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setAlwaysOnTop(true, "screen-saver", 1);
  mainWindow.setOpacity(currentOpacity);
  mainWindow.setBackgroundColor("#0b1020");
  mainWindow.setMenu(null);
  mainWindow.on("enter-full-screen", () => {
    mainWindow == null ? void 0 : mainWindow.setFullScreen(false);
  });
  mainWindow.on("resize", () => {
    updateBrowserBounds();
  });
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname$1, "../dist/index.html"));
  }
  mainWindow.webContents.setZoomFactor(1);
  mainWindow.webContents.setVisualZoomLevelLimits(1, 1).catch(() => {
  });
  mainWindow.webContents.on("before-input-event", (event, input) => {
    const key = input.key.toLowerCase();
    const isZoomShortcut = input.control && (key === "+" || key === "-" || key === "0" || key === "=");
    if (isZoomShortcut) event.preventDefault();
  });
  mainWindow.webContents.on("did-finish-load", emitNavState);
  createBrowserView();
}
app.whenReady().then(() => {
  ipcMain.handle("app:get-window-position", () => (mainWindow == null ? void 0 : mainWindow.getPosition()) ?? [0, 0]);
  ipcMain.on("app:move-window", (_event, x, y) => {
    mainWindow == null ? void 0 : mainWindow.setPosition(Math.round(x), Math.round(y), false);
  });
  ipcMain.on("app:set-dragging", (_event, dragging) => {
    if (!mainWindow) return;
    if (dragging === isDraggingWindow) return;
    isDraggingWindow = dragging;
    if (isDraggingWindow) {
      mainWindow.setOpacity(1);
      return;
    }
    mainWindow.setOpacity(currentOpacity);
  });
  ipcMain.handle("app:close-window", () => {
    mainWindow == null ? void 0 : mainWindow.close();
  });
  ipcMain.handle("app:get-opacity", () => currentOpacity);
  ipcMain.on("app:set-opacity", (_event, nextOpacity) => {
    if (!Number.isFinite(nextOpacity)) return;
    currentOpacity = Math.min(1, Math.max(0.3, nextOpacity));
    if (!isDraggingWindow) mainWindow == null ? void 0 : mainWindow.setOpacity(currentOpacity);
  });
  ipcMain.on("app:set-toolbar-height", (_event, nextHeight) => {
    if (!Number.isFinite(nextHeight)) return;
    toolbarHeight = nextHeight;
    updateBrowserBounds();
  });
  ipcMain.handle("browser:navigate", (_event, rawUrl) => {
    browserView == null ? void 0 : browserView.webContents.loadURL(normalizeUrl(rawUrl)).catch(() => {
    });
  });
  ipcMain.handle("browser:back", () => {
    if (browserView == null ? void 0 : browserView.webContents.canGoBack()) browserView.webContents.goBack();
  });
  ipcMain.handle("browser:forward", () => {
    if (browserView == null ? void 0 : browserView.webContents.canGoForward()) browserView.webContents.goForward();
  });
  ipcMain.handle("browser:reload", () => {
    browserView == null ? void 0 : browserView.webContents.reload();
  });
  ipcMain.handle("browser:home", () => {
    browserView == null ? void 0 : browserView.webContents.loadURL(defaultUrl).catch(() => {
    });
  });
  ipcMain.handle("browser:get-state", () => getNavState());
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

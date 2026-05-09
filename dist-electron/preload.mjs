"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("appInfo", {
  name: "Mini Private Browser"
});
electron.contextBridge.exposeInMainWorld("windowControls", {
  async getWindowPosition() {
    return electron.ipcRenderer.invoke("app:get-window-position");
  },
  moveWindow(x, y) {
    electron.ipcRenderer.send("app:move-window", x, y);
  },
  setDragging(dragging) {
    electron.ipcRenderer.send("app:set-dragging", dragging);
  },
  closeWindow() {
    return electron.ipcRenderer.invoke("app:close-window");
  },
  getOpacity() {
    return electron.ipcRenderer.invoke("app:get-opacity");
  },
  setOpacity(opacity) {
    electron.ipcRenderer.send("app:set-opacity", opacity);
  },
  setToolbarHeight(height) {
    electron.ipcRenderer.send("app:set-toolbar-height", height);
  }
});
electron.contextBridge.exposeInMainWorld("browserApi", {
  navigate(url) {
    return electron.ipcRenderer.invoke("browser:navigate", url);
  },
  back() {
    return electron.ipcRenderer.invoke("browser:back");
  },
  forward() {
    return electron.ipcRenderer.invoke("browser:forward");
  },
  reload() {
    return electron.ipcRenderer.invoke("browser:reload");
  },
  home() {
    return electron.ipcRenderer.invoke("browser:home");
  },
  getState() {
    return electron.ipcRenderer.invoke("browser:get-state");
  },
  onNavigationState(callback) {
    const listener = (_event, state) => callback(state);
    electron.ipcRenderer.on("browser:navigation-state", listener);
    return () => electron.ipcRenderer.removeListener("browser:navigation-state", listener);
  }
});

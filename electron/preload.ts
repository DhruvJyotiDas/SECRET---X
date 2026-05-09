import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('appInfo', {
  name: 'Mini Private Browser',
})

contextBridge.exposeInMainWorld('windowControls', {
  async getWindowPosition(): Promise<[number, number]> {
    return ipcRenderer.invoke('app:get-window-position')
  },
  moveWindow(x: number, y: number): void {
    ipcRenderer.send('app:move-window', x, y)
  },
  setDragging(dragging: boolean): void {
    ipcRenderer.send('app:set-dragging', dragging)
  },
  closeWindow(): Promise<void> {
    return ipcRenderer.invoke('app:close-window')
  },
  getOpacity(): Promise<number> {
    return ipcRenderer.invoke('app:get-opacity')
  },
  setOpacity(opacity: number): void {
    ipcRenderer.send('app:set-opacity', opacity)
  },
  setToolbarHeight(height: number): void {
    ipcRenderer.send('app:set-toolbar-height', height)
  },
})

contextBridge.exposeInMainWorld('browserApi', {
  navigate(url: string): Promise<void> {
    return ipcRenderer.invoke('browser:navigate', url)
  },
  back(): Promise<void> {
    return ipcRenderer.invoke('browser:back')
  },
  forward(): Promise<void> {
    return ipcRenderer.invoke('browser:forward')
  },
  reload(): Promise<void> {
    return ipcRenderer.invoke('browser:reload')
  },
  home(): Promise<void> {
    return ipcRenderer.invoke('browser:home')
  },
  getState(): Promise<{
    url: string
    title: string
    canGoBack: boolean
    canGoForward: boolean
    isLoading: boolean
  }> {
    return ipcRenderer.invoke('browser:get-state')
  },
  onNavigationState(
    callback: (state: {
      url: string
      title: string
      canGoBack: boolean
      canGoForward: boolean
      isLoading: boolean
    }) => void,
  ): () => void {
    const listener = (_event: Electron.IpcRendererEvent, state: any) => callback(state)
    ipcRenderer.on('browser:navigation-state', listener)
    return () => ipcRenderer.removeListener('browser:navigation-state', listener)
  },
})

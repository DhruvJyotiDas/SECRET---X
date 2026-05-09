/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  appInfo: {
    name: string
  }
  windowControls: {
    getWindowPosition: () => Promise<[number, number]>
    moveWindow: (x: number, y: number) => void
    setDragging: (dragging: boolean) => void
    closeWindow: () => Promise<void>
    getOpacity: () => Promise<number>
    setOpacity: (opacity: number) => void
    setToolbarHeight: (height: number) => void
  }
  browserApi: {
    navigate: (url: string) => Promise<void>
    back: () => Promise<void>
    forward: () => Promise<void>
    reload: () => Promise<void>
    home: () => Promise<void>
    getState: () => Promise<{
      url: string
      title: string
      canGoBack: boolean
      canGoForward: boolean
      isLoading: boolean
    }>
    onNavigationState: (callback: (state: {
      url: string
      title: string
      canGoBack: boolean
      canGoForward: boolean
      isLoading: boolean
    }) => void) => () => void
  }
}

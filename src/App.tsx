import { FormEvent, useEffect, useRef, useState } from 'react'

type BrowserState = {
  url: string
  title: string
  canGoBack: boolean
  canGoForward: boolean
  isLoading: boolean
}

function App() {
  const shellRef = useRef<HTMLElement | null>(null)
  const [address, setAddress] = useState('https://chatgpt.com/')
  const [opacity, setOpacity] = useState(0.9)
  const [state, setState] = useState<BrowserState>({
    url: 'https://chatgpt.com/',
    title: 'Mini Browser',
    canGoBack: false,
    canGoForward: false,
    isLoading: false,
  })

  useEffect(() => {
    window.windowControls
      .getOpacity()
      .then((value) => setOpacity(value))
      .catch(() => {})
  }, [])

  useEffect(() => {
    let cleanup = () => {}

    const init = async () => {
      const nextState = await window.browserApi.getState()
      setState(nextState)
      if (nextState.url) setAddress(nextState.url)
      cleanup = window.browserApi.onNavigationState((incoming) => {
        setState(incoming)
        if (incoming.url) setAddress(incoming.url)
      })
    }

    init().catch(() => {})
    return () => cleanup()
  }, [])

  useEffect(() => {
    const node = shellRef.current
    if (!node) return

    const syncToolbarHeight = () => {
      window.windowControls.setToolbarHeight(node.getBoundingClientRect().height)
    }

    syncToolbarHeight()
    const observer = new ResizeObserver(syncToolbarHeight)
    observer.observe(node)
    window.addEventListener('resize', syncToolbarHeight)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', syncToolbarHeight)
    }
  }, [])

  useEffect(() => {
    const api = window.windowControls
    let mouseDown = false
    let dragging = false
    let startScreenX = 0
    let startScreenY = 0
    let baseWindowX = 0
    let baseWindowY = 0
    let nextX = 0
    let nextY = 0
    let rafId: number | null = null
    let sentDragging = false

    const dragHandle = document.getElementById('drag-handle')
    if (!dragHandle) return

    const flushMove = () => {
      if (!rafId) return
      api.moveWindow(nextX, nextY)
      rafId = null
    }

    const onMouseDown = async (event: MouseEvent) => {
      if (event.button !== 0) return
      if ((event.target as HTMLElement).closest('[data-no-drag="true"]')) return

      const [winX, winY] = await api.getWindowPosition()
      mouseDown = true
      dragging = false
      startScreenX = event.screenX
      startScreenY = event.screenY
      baseWindowX = winX
      baseWindowY = winY
      nextX = winX
      nextY = winY
    }

    const onMouseMove = (event: MouseEvent) => {
      if (!mouseDown) return

      const deltaX = event.screenX - startScreenX
      const deltaY = event.screenY - startScreenY
      if (!dragging && Math.abs(deltaX) + Math.abs(deltaY) < 5) return

      dragging = true
      if (!sentDragging) {
        sentDragging = true
        api.setDragging(true)
      }
      nextX = baseWindowX + deltaX
      nextY = baseWindowY + deltaY

      if (!rafId) rafId = window.requestAnimationFrame(flushMove)
    }

    const onMouseUp = () => {
      mouseDown = false
      dragging = false
      if (sentDragging) {
        sentDragging = false
        api.setDragging(false)
      }
      if (rafId) {
        window.cancelAnimationFrame(rafId)
        rafId = null
      }
    }

    dragHandle.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('blur', onMouseUp)

    return () => {
      dragHandle.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('blur', onMouseUp)
      if (sentDragging) api.setDragging(false)
      if (rafId) window.cancelAnimationFrame(rafId)
    }
  }, [])

  const navigate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await window.browserApi.navigate(address)
  }

  return (
    <main className="browser-shell" ref={shellRef}>
      <header className="titlebar" id="drag-handle">
        <h1>{window.appInfo?.name ?? 'Mini Private Browser'}</h1>
        <div className="titlebar-right">
          <span>{state.title || 'Loading...'}</span>
          <div className="opacity-control" data-no-drag="true">
            <button type="button" className="opacity-btn" data-no-drag="true" aria-label="Opacity control">
              Opacity
            </button>
            <div className="opacity-popover" data-no-drag="true">
              <input
                type="range"
                min={30}
                max={100}
                value={Math.round(opacity * 100)}
                onChange={(event) => {
                  const next = Number(event.target.value) / 100
                  setOpacity(next)
                  window.windowControls.setOpacity(next)
                }}
                data-no-drag="true"
              />
              <span>{Math.round(opacity * 100)}%</span>
            </div>
          </div>
          <button
            type="button"
            className="close-btn"
            data-no-drag="true"
            aria-label="Close window"
            onClick={() => window.windowControls.closeWindow().catch(() => {})}
          >
            x
          </button>
        </div>
      </header>

      <form className="toolbar" onSubmit={navigate}>
        <button type="button" onClick={() => window.browserApi.back()} disabled={!state.canGoBack}>
          Back
        </button>
        <button type="button" onClick={() => window.browserApi.forward()} disabled={!state.canGoForward}>
          Forward
        </button>
        <button type="button" onClick={() => window.browserApi.reload()}>
          Reload
        </button>
        <button type="button" onClick={() => window.browserApi.home()}>
          Home
        </button>
        <input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Enter URL and press Enter"
        />
        <button type="submit">Go</button>
      </form>

      <section className="browser-status">
        <span>{state.isLoading ? 'Loading...' : 'Ready'}</span>
        <span>{state.url || 'No page loaded yet'}</span>
      </section>
    </main>
  )
}

export default App

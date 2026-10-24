// Live update connection to the backend's /api/live WebSocket.
// The backend announces "something changed"; the caller reloads its own state.
// Polling stays in place as a fallback, so a lost connection only delays updates.

export function liveUpdatesUrl(base = import.meta.env?.VITE_API_URL, location = globalThis.location) {
  const clean = typeof base === 'string' ? base.trim().replace(/\/+$/, '') : ''
  if (!clean || !location?.href) return null
  const url = new URL(`${clean}/api/live`, location.href)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.href
}

export function connectLiveUpdates({ url = liveUpdatesUrl(), onChange, WebSocketImpl = globalThis.WebSocket, minDelay = 1000, maxDelay = 30000 } = {}) {
  if (!url || typeof WebSocketImpl !== 'function' || typeof onChange !== 'function') return () => {}
  let socket = null
  let stopped = false
  let retryTimer = null
  let delay = minDelay
  let reconnecting = false

  const open = () => {
    socket = new WebSocketImpl(url)
    socket.onopen = () => {
      delay = minDelay
      // Changes may have happened while disconnected.
      if (reconnecting) onChange({ type: 'reconnected' })
    }
    socket.onmessage = event => {
      try {
        const message = JSON.parse(event.data)
        if (message?.type === 'state-changed') onChange(message)
      } catch {
        // Ignore malformed messages.
      }
    }
    socket.onerror = () => socket?.close()
    socket.onclose = () => {
      if (stopped) return
      reconnecting = true
      retryTimer = setTimeout(open, delay)
      delay = Math.min(delay * 2, maxDelay)
    }
  }

  open()
  return () => {
    stopped = true
    clearTimeout(retryTimer)
    socket?.close()
  }
}

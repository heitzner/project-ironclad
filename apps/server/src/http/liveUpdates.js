import { WebSocketServer } from 'ws'

// Live update channel at /api/live.
//
// After any successful change, every connected browser receives
//   { "type": "state-changed", "revision": <number> }
// and reloads its own scoped state through GET /api/portal/state with its own
// session. The message carries no user data, so it is safe to send to everyone.
export function createLiveUpdates({ path = '/api/live', heartbeatMs = 30_000, isAllowedOrigin = () => true } = {}) {
  const sockets = new WebSocketServer({ noServer: true, maxPayload: 1024 })
  let lastRevision = null

  sockets.on('connection', socket => {
    socket.isAlive = true
    socket.on('pong', () => { socket.isAlive = true })
    socket.on('error', () => socket.terminate())
    socket.send(JSON.stringify({ type: 'connected', revision: lastRevision }))
  })

  // Drop connections that stopped answering (closed laptop lid, lost Wi-Fi).
  const heartbeat = setInterval(() => {
    for (const socket of sockets.clients) {
      if (!socket.isAlive) { socket.terminate(); continue }
      socket.isAlive = false
      socket.ping()
    }
  }, heartbeatMs)
  heartbeat.unref()

  const live = {
    attach(server) {
      server.on('upgrade', (request, socket, head) => {
        const { pathname } = new URL(request.url, 'http://localhost')
        if (pathname !== path || !isAllowedOrigin(request.headers.origin)) {
          socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n')
          socket.destroy()
          return
        }
        sockets.handleUpgrade(request, socket, head, client => sockets.emit('connection', client, request))
      })
      return live
    },

    publish(revision) {
      if (revision === lastRevision) return
      lastRevision = revision
      const message = JSON.stringify({ type: 'state-changed', revision })
      for (const socket of sockets.clients) if (socket.readyState === socket.OPEN) socket.send(message)
    },

    // Announces a change once the response has been sent. With the Postgres store
    // the response is sent only after the commit, so browsers never reload ahead
    // of the database. Failed requests and unchanged revisions announce nothing.
    middleware(repository) {
      return (request, response, next) => {
        if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next()
        response.on('finish', () => {
          if (response.statusCode < 400) live.publish(repository.readState().revision)
        })
        next()
      }
    },

    get clientCount() { return sockets.clients.size },

    close() {
      clearInterval(heartbeat)
      for (const socket of sockets.clients) socket.terminate()
      sockets.close()
    },
  }
  return live
}

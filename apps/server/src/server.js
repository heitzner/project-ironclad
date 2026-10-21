import { createApp } from './app.js'
import { config } from './config.js'

const { app } = createApp()
const server = app.listen(config.port, () => {
  console.log(`IronClad API listening on http://localhost:${config.port}/api`)
})

function shutdown() { server.close(() => process.exit(0)) }
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

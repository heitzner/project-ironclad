import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true })

const [{ createApp }, { config }] = await Promise.all([
  import('./app.js'),
  import('./config.js'),
])

const { app } = createApp()
const server = app.listen(config.port, () => {
  console.log(`IronClad API listening on http://localhost:${config.port}/api`)
})

function shutdown() { server.close(() => process.exit(0)) }
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true })

const [{ createApp }, { config }] = await Promise.all([
  import('./app.js'),
  import('./config.js'),
])

let repository, pool
if (config.dataStore === 'postgres') {
  const [{ createPool }, { PostgresPortalRepository }] = await Promise.all([
    import('./db/pool.js'),
    import('./repositories/PostgresPortalRepository.js'),
  ])
  pool = createPool(config.database)
  repository = await PostgresPortalRepository.connect({ pool })
}

const { app, live } = createApp({ repository })
const server = app.listen(config.port, () => {
  console.log(`IronClad API listening on http://localhost:${config.port}/api (store: ${config.dataStore})`)
})
live.attach(server)

function shutdown() { live.close(); server.close(async () => { await pool?.end(); process.exit(0) }) }
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

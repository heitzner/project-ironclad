import { readFileSync } from 'node:fs'
import pg from 'pg'

// Connection pool for the Supabase PostgreSQL database.
// Use the Session pooler connection string (port 5432) from the Supabase "Connect"
// dialog, without an sslmode parameter: SSL is configured here instead.
export function createPool({ url, caCertPath, max }) {
  if (!url) throw new Error('DATABASE_URL is required when DATA_STORE=postgres')
  const ssl = caCertPath
    ? { ca: readFileSync(caCertPath, 'utf8'), rejectUnauthorized: true }
    : { rejectUnauthorized: false }
  if (!caCertPath) console.warn('[database] DATABASE_CA_CERT is not set: the connection is encrypted but the server certificate is not verified')

  const pool = new pg.Pool({ connectionString: url, ssl, max, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000 })
  pool.on('error', error => console.error('[database] idle client error:', error.message))
  return pool
}

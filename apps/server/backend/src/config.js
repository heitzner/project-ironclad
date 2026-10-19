const parsePort = (value) => {
  const port = Number.parseInt(value ?? '3000', 10)
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : 3000
}

const parseOrigins = (value) => (value ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export const config = Object.freeze({
  port: parsePort(process.env.PORT),
  clientOrigins: parseOrigins(process.env.CLIENT_ORIGINS),
})

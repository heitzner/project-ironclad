const integer = (name, fallback) => {
  const value = Number(process.env[name] || fallback)
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`)
  return value
}

export const config = Object.freeze({
  port: integer('PORT', 3000),
  jwtSecret: process.env.JWT_SECRET || 'ironclad-local-development-secret-change-me',
  jwtTtlSeconds: integer('JWT_TTL_SECONDS', 8 * 60 * 60),
  otpTtlSeconds: integer('OTP_TTL_SECONDS', 10 * 60),
  otpResendSeconds: integer('OTP_RESEND_SECONDS', 60),
  production: process.env.NODE_ENV === 'production',
  dataStore: (() => {
    const value = process.env.DATA_STORE || 'memory'
    if (!['memory', 'postgres'].includes(value)) throw new Error('DATA_STORE must be "memory" or "postgres"')
    return value
  })(),
  database: Object.freeze({
    url: process.env.DATABASE_URL || '',
    caCertPath: process.env.DATABASE_CA_CERT || '',
    poolMax: integer('DATABASE_POOL_MAX', 5),
  }),
  email: Object.freeze({
    user: process.env.GMAIL_USER || '',
    pass: process.env.GMAIL_APP_PASSWORD || '',
    fromName: process.env.EMAIL_FROM_NAME || 'Project IronClad',
  }),
  cors: Object.freeze({
    allowedOrigins: Object.freeze((process.env.CORS_ALLOWED_ORIGINS
      || 'http://localhost:5173,http://127.0.0.1:5173')
      .split(',').map(value => value.trim()).filter(Boolean)),
    allowLocalDevelopmentOrigins: process.env.CORS_ALLOW_LOCAL_DEVELOPMENT_ORIGINS !== 'false',
  }),
})

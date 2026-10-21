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
  production: process.env.NODE_ENV === 'production',
  cors: Object.freeze({
    allowedOrigins: Object.freeze((process.env.CORS_ALLOWED_ORIGINS
      || 'http://localhost:5173,http://127.0.0.1:5173')
      .split(',').map(value => value.trim()).filter(Boolean)),
    allowLocalDevelopmentOrigins: process.env.CORS_ALLOW_LOCAL_DEVELOPMENT_ORIGINS !== 'false',
  }),
})

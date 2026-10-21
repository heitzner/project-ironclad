import express from 'express'

const asyncRoute = handler => (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next)

// Compatibility aliases for clients using send-code/verify-code. The primary
// UI uses /verifications and /verifications/confirm with the same contract.
export function createAuthRoutes({ authService, optionalAuth }) {
  const router = express.Router()
  router.post('/send-code', optionalAuth, asyncRoute(async (request, response) => {
    const challenge = await authService.requestVerification(request.body || {}, request.identity?.account || null)
    response.status(201).json(challenge)
  }))
  router.post('/verify-code', optionalAuth, asyncRoute((request, response) => {
    response.json(authService.verifyEmail(request.body || {}, request.identity?.account || null))
  }))
  return router
}

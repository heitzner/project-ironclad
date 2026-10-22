import express from 'express'
import { config } from './config.js'
import { HttpError, errorMiddleware } from './http/errors.js'
import { requirePositions, requireRoles } from './http/access.js'
import { InMemoryPortalRepository } from './repositories/InMemoryPortalRepository.js'
import { createAuthRoutes } from './routes/authRoutes.js'
import { AuthService } from './services/AuthService.js'
import { createEmailVerificationService } from './services/emailVerificationService.js'
import { PortalService } from './services/PortalService.js'

const asyncRoute = handler => (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next)

function bearerToken(request) {
  const header = request.get('authorization') || ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  return match?.[1] || ''
}

function csvCell(value) { return `"${String(value ?? '').replaceAll('"', '""')}"` }
function archiveCsv(records) {
  const fields = ['permitNo', 'title', 'category', 'organizer', 'concludedDate', 'academicYear', 'semester', 'venue', 'courseSection', 'startTime', 'endTime']
  return [fields.join(','), ...records.map(record => fields.map(field => csvCell(field === 'venue' ? record.venue.label : record[field])).join(','))].join('\r\n')
}
function archivePdf(records) {
  const lines = ['IronClad Campus Archive', '', ...records.flatMap(record => [`${record.permitNo} - ${record.title}`, `${record.concludedDate} | ${record.venue.label} | ${record.category}`, ''])]
  const escaped = lines.map(line => String(line).replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)'))
  const content = `BT /F1 12 Tf 54 760 Td 15 TL ${escaped.map((line, index) => `${index ? 'T* ' : ''}(${line}) Tj`).join(' ')} ET`
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream endobj`,
  ]
  let output = '%PDF-1.4\n', offsets = [0]
  for (const object of objects) { offsets.push(Buffer.byteLength(output)); output += `${object}\n` }
  const xref = Buffer.byteLength(output)
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(output)
}

export function createApp({ repository = new InMemoryPortalRepository(), authService, portalService, emailService } = {}) {
  const mail = emailService || createEmailVerificationService(config.email)
  const auth = authService || new AuthService(repository, { emailService: mail })
  const portal = portalService || new PortalService(repository, auth)
  const app = express()
  app.disable('x-powered-by')
  app.use((request, response, next) => {
    const origin = request.get('origin')
    const localOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '')
    if (origin && (config.cors.allowedOrigins.includes(origin) || config.cors.allowLocalDevelopmentOrigins && localOrigin)) {
      response.set('Access-Control-Allow-Origin', origin)
      response.set('Vary', 'Origin')
      response.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
      response.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
    }
    if (request.method === 'OPTIONS') return response.sendStatus(204)
    next()
  })
  app.use(express.json({ limit: '1mb' }))

  const optionalAuth = (request, _response, next) => {
    try { const token = bearerToken(request); request.identity = token ? auth.authenticate(token) : null; next() } catch (error) { next(error) }
  }
  const requiredAuth = (request, _response, next) => {
    try {
      const token = bearerToken(request)
      if (!token) throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue')
      request.identity = auth.authenticate(token); next()
    } catch (error) { next(error) }
  }

  app.get(['/health', '/api/health'], (_request, response) => response.json({ status: 'ok', service: 'ironclad-server', store: 'in-memory' }))
  app.post('/api/auth/sign-in', asyncRoute((request, response) => response.json(auth.signIn(request.body || {}))))
  app.post('/api/auth/register', asyncRoute((request, response) => response.status(201).json(auth.register(request.body || {}))))
  app.post('/api/auth/password-reset', asyncRoute((request, response) => response.json(auth.resetPassword(request.body || {}))))
  app.get('/api/auth/session', optionalAuth, (request, response) => response.json(request.identity ? auth.sessionPayload(request.identity.account) : { user: null, capabilities: {} }))
  app.post('/api/auth/sign-out', requiredAuth, (request, response) => response.json(auth.signOut(request.identity.claims)))
  app.post('/api/auth/verifications', optionalAuth, asyncRoute(async (request, response) => response.status(201).json(await auth.requestVerification(request.body || {}, request.identity?.account || null))))
  app.post('/api/auth/verifications/confirm', optionalAuth, asyncRoute((request, response) => response.json(auth.verifyEmail(request.body || {}, request.identity?.account || null))))
  app.post('/api/auth/password', requiredAuth, asyncRoute((request, response) => response.json(auth.changePassword(request.identity.account, request.body || {}))))
  app.use('/api/auth', createAuthRoutes({ authService: auth, optionalAuth }))

  app.get('/api/portal/state', optionalAuth, (request, response) => response.json(portal.stateFor(request.identity?.account || null)))
  app.post('/api/portal/bookings', requiredAuth, asyncRoute((request, response) => response.status(201).json(portal.createBooking(request.identity.account, request.body || {}))))
  app.post('/api/portal/bookings/:id/decision', requiredAuth, requireRoles('admin'), asyncRoute((request, response) => response.json(portal.decideBooking(request.identity.account, request.params.id, request.body || {}))))
  app.post('/api/portal/closures', requiredAuth, requireRoles('admin'), asyncRoute((request, response) => response.status(201).json(portal.createClosure(request.identity.account, request.body || {}))))
  app.delete('/api/portal/rooms/:id/closures', requiredAuth, requireRoles('admin'), asyncRoute((request, response) => response.json(portal.reopenRoom(request.identity.account, request.params.id))))
  app.post('/api/portal/posts', requiredAuth, requireRoles('admin', 'council'), asyncRoute((request, response) => response.status(201).json(portal.publish(request.identity.account, request.body || {}))))
  app.post('/api/portal/posts/:id/submissions', requiredAuth, asyncRoute((request, response) => response.status(201).json(portal.submit(request.identity.account, request.params.id, request.body || {}))))
  app.post('/api/portal/applications/:id/decision', requiredAuth, requireRoles('admin', 'council'), asyncRoute((request, response) => response.json(portal.reviewApplication(request.identity.account, request.params.id, request.body || {}))))
  app.patch('/api/portal/profiles/:id', requiredAuth, asyncRoute((request, response) => response.json(portal.saveProfile(request.identity.account, request.params.id, request.body || {}))))
  app.patch('/api/portal/members/:id/position', requiredAuth, requireRoles('admin', 'council'), requirePositions('President', 'Vice President', 'Secretary'), asyncRoute((request, response) => response.json(portal.assignPosition(request.identity.account, request.params.id, request.body || {}))))
  app.post('/api/portal/handovers', requiredAuth, requireRoles('admin', 'council'), requirePositions('President', 'Vice President', 'Secretary'), asyncRoute((request, response) => response.status(201).json(portal.nominatePresident(request.identity.account, request.body || {}))))
  app.post('/api/portal/handovers/:id/respond', requiredAuth, asyncRoute((request, response) => response.json(portal.respondHandover(request.identity.account, request.params.id, request.body || {}))))

  app.get('/api/dashboard', requiredAuth, requireRoles('admin'), asyncRoute((request, response) => response.json(portal.dashboard(request.identity.account))))
  app.get('/api/archive', requiredAuth, asyncRoute((request, response) => response.json(portal.archive(request.identity.account, request.query))))
  const exportArchive = asyncRoute((request, response) => {
    const payload = portal.archive(request.identity.account, request.params.id ? {} : request.query)
    const records = request.params.id ? payload.records.filter(record => record.id === request.params.id) : payload.records
    if (!records.length) throw new HttpError(404, 'ARCHIVE_NOT_FOUND', 'No matching archive records were found')
    const format = String(request.query.format || 'pdf').toLowerCase()
    if (!['pdf', 'csv'].includes(format)) throw new HttpError(422, 'INVALID_FORMAT', 'Choose PDF or CSV format')
    const name = request.params.id ? records[0].permitNo : 'ironclad-campus-archive'
    response.set('Content-Disposition', `attachment; filename="${name}.${format}"`)
    if (format === 'csv') return response.type('text/csv').send(archiveCsv(records))
    return response.type('application/pdf').send(archivePdf(records))
  })
  app.get('/api/archive/export', requiredAuth, exportArchive)
  app.get('/api/archive/:id/export', requiredAuth, exportArchive)

  if (!config.production) app.post('/api/test/reset', (_request, response) => response.json({ reset: true, accountCount: repository.reset().accounts.length }))
  app.use((request, _response, next) => next(new HttpError(404, 'ROUTE_NOT_FOUND', `Route does not exist: ${request.method} ${request.path}`)))
  app.use(errorMiddleware)
  return { app, repository, authService: auth, portalService: portal, emailService: mail }
}

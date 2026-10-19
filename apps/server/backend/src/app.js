import express from 'express'
import { config as defaultConfig } from './config.js'
import { createDemoData } from './data/demoData.js'
import { errorMiddleware, HttpError } from './http/errors.js'
import { parseDetailsQuery, parseListQuery, parseLockBody, parseReservationConfigQuery } from './http/validation.js'
import { InMemoryBookingRepository } from './repositories/inMemoryBookingRepository.js'
import { BookingService } from './services/bookingService.js'

const isLocalOrigin = (origin) => {
  try {
    const url = new URL(origin)
    return ['localhost', '127.0.0.1'].includes(url.hostname) && ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}

export function createApp({ repository, settings = defaultConfig } = {}) {
  const store = repository ?? new InMemoryBookingRepository(createDemoData(settings.demoWeekStart))
  const booking = new BookingService(store, settings)
  const app = express()

  app.disable('x-powered-by')
  app.use(express.json({ limit: '32kb' }))
  app.use((request, response, next) => {
    const origin = request.get('origin')
    if (origin && (settings.clientOrigins.includes(origin) || isLocalOrigin(origin))) {
      response.set('Access-Control-Allow-Origin', origin)
      response.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
      response.set('Access-Control-Allow-Headers', 'Content-Type')
      response.set('Vary', 'Origin')
    }
    if (request.method === 'OPTIONS') return response.sendStatus(204)
    return next()
  })

  app.get('/health', (_request, response) => response.json({ status: 'ok', service: 'student-booking' }))
  app.get('/dates/options', (_request, response) => response.json(booking.getDateOptions()))
  app.get('/booking/notices', (_request, response) => response.json(booking.getNotices()))
  app.get('/reservations/config', (request, response, next) => {
    try { response.json(booking.getReservationConfig(parseReservationConfigQuery(request.query, settings))) } catch (error) { next(error) }
  })
  app.get('/venues', (request, response, next) => {
    try { response.json(booking.listVenues(parseListQuery(request.query, settings))) } catch (error) { next(error) }
  })
  app.get('/venues/:roomCode', (request, response, next) => {
    try { response.json(booking.getVenue(request.params.roomCode, parseDetailsQuery(request.query, settings))) } catch (error) { next(error) }
  })
  app.post('/reservations/lock', (request, response, next) => {
    try { response.status(201).json(booking.requestLock(parseLockBody(request.body, settings))) } catch (error) { next(error) }
  })

  app.use((_request, _response, next) => next(new HttpError(404, 'ROUTE_NOT_FOUND', 'Route does not exist.')))
  app.use(errorMiddleware)
  return app
}

import express from 'express';
import { config } from './config.js';
import { createDemoData } from './data/demoData.js';
import { createAdminAccessMiddleware } from './http/adminAccess.js';
import { createCouncilAccessMiddleware } from './http/councilAccess.js';
import { errorMiddleware, HttpError } from './http/errors.js';
import {
  parseAdminRequestQuery,
  parseAdminVenueQuery,
  parseCouncilRequestQuery,
  parseCouncilReservationBody,
  parseCouncilSidebarQuery,
  parseCouncilVenueQuery,
  parseDecisionBody,
  parseDetailsQuery,
  parseEndorsementBody,
  parseListQuery,
  parseLockBody,
  parseOccupancyQuery,
  parseReservationConfigQuery,
  parseVacancyQuery,
} from './http/validation.js';
import { InMemoryBookingRepository } from './repositories/inMemoryBookingRepository.js';
import { AdminBookingService } from './services/adminBookingService.js';
import { BookingService } from './services/bookingService.js';
import { CouncilBookingService } from './services/councilBookingService.js';

export function createApp({ repository, settings = config } = {}) {
  const store = repository || new InMemoryBookingRepository(createDemoData(settings.demoWeekStart));
  const booking = new BookingService(store, settings);
  const admin = new AdminBookingService(store, booking, settings);
  const council = new CouncilBookingService(store, booking, admin, settings);
  const requireAdmin = createAdminAccessMiddleware(store, settings);
  const requireCouncil = createCouncilAccessMiddleware(store, settings);
  const app = express();

  app.disable('x-powered-by');
  app.use((request, response, next) => {
    const origin = request.get('origin');
    if (origin && settings.cors.allowedOrigins.includes(origin)) {
      response.set('Access-Control-Allow-Origin', origin);
      response.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      response.set('Access-Control-Allow-Headers', 'Content-Type,x-ironclad-test-session');
      response.set('Vary', 'Origin');
      if (request.method === 'OPTIONS') return response.sendStatus(204);
    }
    return next();
  });
  app.use(express.json({ limit: '32kb' }));
  app.use('/admin', requireAdmin);
  app.use('/council', requireCouncil);

  app.get('/admin/session', (request, response, next) => {
    try { response.json(admin.getSession(request.adminSession)); } catch (error) { next(error); }
  });
  app.get('/admin/room-bookings/venues', (request, response, next) => {
    try { response.json(admin.listVenues(parseAdminVenueQuery(request.query, settings))); } catch (error) { next(error); }
  });
  app.get('/admin/booking-requests', (request, response, next) => {
    try { response.json(admin.listRequests(parseAdminRequestQuery(request.query, settings))); } catch (error) { next(error); }
  });
  app.get('/admin/booking-requests/:reservationId', (request, response, next) => {
    try { response.json(admin.getRequest(request.params.reservationId)); } catch (error) { next(error); }
  });
  app.post('/admin/booking-requests/:reservationId/approve', (request, response, next) => {
    try { response.json(admin.approve(request.params.reservationId, parseDecisionBody(request.body, settings).reason, request.adminSession)); } catch (error) { next(error); }
  });
  app.post('/admin/booking-requests/:reservationId/reject', (request, response, next) => {
    try { response.json(admin.reject(request.params.reservationId, parseDecisionBody(request.body, settings).reason, request.adminSession)); } catch (error) { next(error); }
  });

  app.get('/council/session', (request, response, next) => {
    try { response.json(council.getSession(request.councilSession)); } catch (error) { next(error); }
  });
  app.get('/council/venues', (request, response, next) => {
    try { response.json(council.listVenues(parseCouncilVenueQuery(request.query, settings))); } catch (error) { next(error); }
  });
  app.get('/council/venues/:roomCode/sidebar', (request, response, next) => {
    try { response.json(council.venueSidebar(request.params.roomCode, parseCouncilSidebarQuery(request.query, settings))); } catch (error) { next(error); }
  });
  app.get('/council/booking-requests', (request, response, next) => {
    try { response.json(council.listRequests(parseCouncilRequestQuery(request.query, settings))); } catch (error) { next(error); }
  });
  app.get('/council/booking-requests/:reservationId/sidebar', (request, response, next) => {
    try { response.json(council.requestSidebar(request.params.reservationId, parseCouncilSidebarQuery(request.query, settings).atTime)); } catch (error) { next(error); }
  });
  app.get('/council/notices', (_request, response, next) => {
    try { response.json(council.listNotices()); } catch (error) { next(error); }
  });
  app.get('/council/notices/:noticeId/guidelines', (request, response, next) => {
    try { response.json(council.getGuidelines(request.params.noticeId)); } catch (error) { next(error); }
  });
  app.get('/council/reservations/config', (request, response, next) => {
    try { response.json(council.getReservationConfig(request.councilSession)); } catch (error) { next(error); }
  });
  app.post('/council/reservations', (request, response, next) => {
    try { response.status(201).json(council.createReservation(parseCouncilReservationBody(request.body, settings), request.councilSession)); } catch (error) { next(error); }
  });
  app.post('/council/booking-requests/:reservationId/endorsements', (request, response, next) => {
    try { response.status(201).json(council.createEndorsement(request.params.reservationId, parseEndorsementBody(request.body, settings).message, request.councilSession)); } catch (error) { next(error); }
  });

  app.get('/venues', (request, response, next) => {
    try { response.json(booking.listVenues(parseListQuery(request.query, settings))); } catch (error) { next(error); }
  });
  app.get('/venues/:roomCode/occupancy', (request, response, next) => {
    try { response.json(booking.getOccupancy(request.params.roomCode, parseOccupancyQuery(request.query, settings))); } catch (error) { next(error); }
  });
  app.get('/venues/:roomCode/vacancy', (request, response, next) => {
    try { response.json(booking.getVacancy(request.params.roomCode, parseVacancyQuery(request.query, settings))); } catch (error) { next(error); }
  });
  app.get('/venues/:roomCode', (request, response, next) => {
    try { response.json(booking.getVenue(request.params.roomCode, parseDetailsQuery(request.query, settings))); } catch (error) { next(error); }
  });
  app.get('/dates/options', (_request, response, next) => {
    try { response.json(booking.getDateOptions()); } catch (error) { next(error); }
  });
  app.get('/reservations/config', (request, response, next) => {
    try { response.json(booking.getReservationConfig(parseReservationConfigQuery(request.query, settings))); } catch (error) { next(error); }
  });
  app.post('/reservations/lock', (request, response, next) => {
    try { response.status(201).json(booking.requestLock(parseLockBody(request.body, settings))); } catch (error) { next(error); }
  });
  app.post('/reservations/:reservationId/approve', requireAdmin, (request, response, next) => {
    try { response.json(admin.approve(request.params.reservationId, parseDecisionBody(request.body, settings).reason, request.adminSession)); } catch (error) { next(error); }
  });
  app.post('/reservations/:reservationId/reject', requireAdmin, (request, response, next) => {
    try { response.json(admin.reject(request.params.reservationId, parseDecisionBody(request.body, settings).reason, request.adminSession)); } catch (error) { next(error); }
  });

  app.use((_request, _response, next) => next(new HttpError(404, 'ROUTE_NOT_FOUND', 'Route does not exist')));
  app.use(errorMiddleware);
  return app;
}

import express from 'express';
import { config } from './config.js';
import { createDemoData } from './data/demoData.js';
import { createAdminAccessMiddleware } from './http/adminAccess.js';
import { errorMiddleware, HttpError } from './http/errors.js';
import {
  parseAdminRequestQuery,
  parseAdminVenueQuery,
  parseDecisionBody,
  parseDetailsQuery,
  parseListQuery,
  parseLockBody,
  parseOccupancyQuery,
  parseReservationConfigQuery,
  parseVacancyQuery,
} from './http/validation.js';
import { InMemoryBookingRepository } from './repositories/inMemoryBookingRepository.js';
import { AdminBookingService } from './services/adminBookingService.js';
import { BookingService } from './services/bookingService.js';

export function createApp({ repository, settings = config } = {}) {
  const activeRepository = repository
    || new InMemoryBookingRepository(createDemoData(settings.demoWeekStart));
  const bookingService = new BookingService(activeRepository, settings);
  const adminBookingService = new AdminBookingService(
    activeRepository,
    bookingService,
    settings,
  );
  const requireAdmin = createAdminAccessMiddleware(activeRepository, settings);
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  app.use('/admin', requireAdmin);

  app.get('/admin/session', (request, response, next) => {
    try {
      response.json(adminBookingService.getSession(request.adminSession));
    } catch (error) {
      next(error);
    }
  });

  app.get('/admin/room-bookings/venues', (request, response, next) => {
    try {
      response.json(adminBookingService.listVenues(
        parseAdminVenueQuery(request.query, settings),
      ));
    } catch (error) {
      next(error);
    }
  });

  app.get('/admin/booking-requests', (request, response, next) => {
    try {
      response.json(adminBookingService.listRequests(
        parseAdminRequestQuery(request.query, settings),
      ));
    } catch (error) {
      next(error);
    }
  });

  app.get('/admin/booking-requests/:reservationId', (request, response, next) => {
    try {
      response.json(adminBookingService.getRequest(request.params.reservationId));
    } catch (error) {
      next(error);
    }
  });

  app.post('/admin/booking-requests/:reservationId/approve', (request, response, next) => {
    try {
      const { reason } = parseDecisionBody(request.body, settings);
      response.json(adminBookingService.approve(
        request.params.reservationId,
        reason,
        request.adminSession,
      ));
    } catch (error) {
      next(error);
    }
  });

  app.post('/admin/booking-requests/:reservationId/reject', (request, response, next) => {
    try {
      const { reason } = parseDecisionBody(request.body, settings);
      response.json(adminBookingService.reject(
        request.params.reservationId,
        reason,
        request.adminSession,
      ));
    } catch (error) {
      next(error);
    }
  });

  app.get('/venues', (request, response, next) => {
    try {
      response.json(bookingService.listVenues(parseListQuery(request.query, settings)));
    } catch (error) {
      next(error);
    }
  });

  app.get('/venues/:roomCode/occupancy', (request, response, next) => {
    try {
      response.json(bookingService.getOccupancy(
        request.params.roomCode,
        parseOccupancyQuery(request.query, settings),
      ));
    } catch (error) {
      next(error);
    }
  });

  app.get('/venues/:roomCode/vacancy', (request, response, next) => {
    try {
      response.json(bookingService.getVacancy(
        request.params.roomCode,
        parseVacancyQuery(request.query, settings),
      ));
    } catch (error) {
      next(error);
    }
  });

  app.get('/venues/:roomCode', (request, response, next) => {
    try {
      response.json(
        bookingService.getVenue(
          request.params.roomCode,
          parseDetailsQuery(request.query, settings),
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  app.get('/dates/options', (_request, response, next) => {
    try {
      response.json(bookingService.getDateOptions());
    } catch (error) {
      next(error);
    }
  });

  app.get('/reservations/config', (request, response, next) => {
    try {
      response.json(bookingService.getReservationConfig(
        parseReservationConfigQuery(request.query, settings),
      ));
    } catch (error) {
      next(error);
    }
  });

  app.post('/reservations/lock', (request, response, next) => {
    try {
      response.status(201).json(
        bookingService.requestLock(parseLockBody(request.body, settings)),
      );
    } catch (error) {
      next(error);
    }
  });

  app.post('/reservations/:reservationId/approve', requireAdmin, (request, response, next) => {
    try {
      const { reason } = parseDecisionBody(request.body, settings);
      response.json(adminBookingService.approve(
        request.params.reservationId,
        reason,
        request.adminSession,
      ));
    } catch (error) {
      next(error);
    }
  });

  app.post('/reservations/:reservationId/reject', requireAdmin, (request, response, next) => {
    try {
      const { reason } = parseDecisionBody(request.body, settings);
      response.json(adminBookingService.reject(
        request.params.reservationId,
        reason,
        request.adminSession,
      ));
    } catch (error) {
      next(error);
    }
  });

  app.use((_request, _response, next) => {
    next(new HttpError(404, 'ROUTE_NOT_FOUND', 'Route does not exist'));
  });
  app.use(errorMiddleware);
  return app;
}

import express from 'express';
import { config } from './config.js';
import { createDemoData } from './data/demoData.js';
import { newsFeedSeed } from './data/newsFeedSeed.js';
import { createAdminAccessMiddleware } from './http/adminAccess.js';
import { errorMiddleware, HttpError } from './http/errors.js';
import {
  parseAdminRequestQuery,
  parseAdminVenueQuery,
  parseCouncilRoleBody,
  parseDecisionBody,
  parseDetailsQuery,
  parseListQuery,
  parseLockBody,
  parseOccupancyQuery,
  parseReservationConfigQuery,
  parseEventBody,
  parseFeedQuery,
  parseVersionBody,
  parseVacancyQuery,
} from './http/validation.js';
import { InMemoryBookingRepository } from './repositories/inMemoryBookingRepository.js';
import { InMemoryNewsRepository } from './repositories/InMemoryNewsRepository.js';
import { AdminBookingService } from './services/adminBookingService.js';
import { AdminPortalService } from './services/adminPortalService.js';
import { BookingService } from './services/bookingService.js';
import { NewsFeedService } from './services/NewsFeedService.js';

export function createApp({
  repository,
  newsRepository,
  newsSeed = newsFeedSeed,
  settings = config,
} = {}) {
  const activeRepository = repository
    || new InMemoryBookingRepository(createDemoData(settings.demoWeekStart));
  const activeNewsRepository = newsRepository || new InMemoryNewsRepository(newsSeed);
  const bookingService = new BookingService(activeRepository, settings);
  const adminBookingService = new AdminBookingService(
    activeRepository,
    bookingService,
    settings,
  );
  const adminPortalService = new AdminPortalService(activeRepository, settings);
  const newsFeedService = new NewsFeedService(activeNewsRepository);
  const requireAdmin = createAdminAccessMiddleware(activeRepository, settings);
  const app = express();

  app.disable('x-powered-by');
  app.use((request, response, next) => {
    const origin = request.get('origin');
    const localDevelopmentOrigin = settings.cors?.allowLocalDevelopmentOrigins
      && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '');
    if (origin && (settings.cors?.allowedOrigins?.includes(origin) || localDevelopmentOrigin)) {
      response.set('Access-Control-Allow-Origin', origin);
      response.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,OPTIONS');
      response.set('Access-Control-Allow-Headers', 'Content-Type,x-ironclad-test-session');
      response.set('Vary', 'Origin');
      if (request.method === 'OPTIONS') return response.sendStatus(204);
    }
    return next();
  });
  app.use(express.json({ limit: '32kb' }));

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok', service: 'ironclad-booking' });
  });

  app.get('/news-feed', (request, response, next) => {
    try {
      const categories = newsFeedService.getCategories().map((category) => category.value);
      response.json(newsFeedService.list(parseFeedQuery(request.query, categories)));
    } catch (error) {
      next(error);
    }
  });

  app.get('/news-feed/:postId', (request, response, next) => {
    try {
      response.json(newsFeedService.getById(request.params.postId));
    } catch (error) {
      next(error);
    }
  });

  app.get('/booking/notices', (_request, response, next) => {
    try {
      response.json(bookingService.getNotices());
    } catch (error) {
      next(error);
    }
  });

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

  app.get('/admin/events', (_request, response, next) => {
    try { response.json(adminPortalService.listEvents()); } catch (error) { next(error); }
  });

  app.post('/admin/events', (request, response, next) => {
    try {
      response.status(201).json(adminPortalService.createEvent(
        parseEventBody(request.body),
        request.adminSession,
      ));
    } catch (error) { next(error); }
  });

  app.put('/admin/events/:eventId', (request, response, next) => {
    try {
      response.json(adminPortalService.updateEvent(
        request.params.eventId,
        parseEventBody(request.body, { requireVersion: true }),
      ));
    } catch (error) { next(error); }
  });

  app.post('/admin/events/:eventId/complete', (request, response, next) => {
    try {
      response.json(adminPortalService.completeEvent(
        request.params.eventId,
        parseVersionBody(request.body),
      ));
    } catch (error) { next(error); }
  });

  app.get('/admin/members', (_request, response, next) => {
    try { response.json(adminPortalService.listMembers()); } catch (error) { next(error); }
  });

  app.get('/admin/council-roles', (_request, response, next) => {
    try { response.json(adminPortalService.listRoles()); } catch (error) { next(error); }
  });

  app.patch('/admin/members/:memberId/council-role', (request, response, next) => {
    try {
      response.json(adminPortalService.setCouncilRole(
        request.params.memberId,
        parseCouncilRoleBody(request.body),
      ));
    } catch (error) { next(error); }
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

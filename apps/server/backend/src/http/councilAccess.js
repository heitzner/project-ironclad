import { HttpError } from './errors.js';

export function createCouncilAccessMiddleware(repository, settings) {
  return function requireCouncil(request, _response, next) {
    try {
      const sessionId = request.get(settings.council.sessionHeader);
      if (!sessionId) throw new HttpError(401, 'COUNCIL_SESSION_REQUIRED', 'Council test session is required');
      const session = repository.resolveCouncilSession(sessionId, settings.council);
      if (!session) throw new HttpError(401, 'INVALID_COUNCIL_SESSION', 'Council test session is invalid');
      if (session.role !== 'COUNCIL') throw new HttpError(403, 'COUNCIL_ROLE_REQUIRED', 'COUNCIL role is required');
      request.councilSession = session;
      next();
    } catch (error) { next(error); }
  };
}

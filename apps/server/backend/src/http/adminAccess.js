import { HttpError } from './errors.js';

export function createAdminAccessMiddleware(repository, settings) {
  return function requireAdmin(request, _response, next) {
    try {
      const sessionId = request.get(settings.admin.sessionHeader);
      if (!sessionId) throw new HttpError(401, 'ADMIN_SESSION_REQUIRED', 'Admin test session is required');
      const session = repository.resolveAdminSession(sessionId, settings.admin);
      if (!session) throw new HttpError(401, 'INVALID_ADMIN_SESSION', 'Admin test session is invalid');
      if (session.role !== 'ADMIN') throw new HttpError(403, 'ADMIN_ROLE_REQUIRED', 'ADMIN role is required');
      request.adminSession = session;
      next();
    } catch (error) { next(error); }
  };
}

import { HttpError } from './errors.js'

export const requireRoles = (...roles) => (request, _response, next) => {
  if (!request.identity) return next(new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue'))
  if (!roles.includes(request.identity.user.role)) return next(new HttpError(403, 'FORBIDDEN', 'You do not have permission to perform this action'))
  next()
}

export const requirePositions = (...positions) => (request, _response, next) => {
  if (!request.identity) return next(new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue'))
  if (!positions.includes(request.identity.user.position)) return next(new HttpError(403, 'FORBIDDEN', `Only ${positions.join(', ')} may perform this action`))
  next()
}

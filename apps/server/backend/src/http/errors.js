export class HttpError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function errorMiddleware(error, _request, response, _next) {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return response.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Request body must contain valid JSON' },
    });
  }
  const known = error instanceof HttpError;
  const payload = {
    error: {
      code: known ? error.code : 'INTERNAL_SERVER_ERROR',
      message: known ? error.message : 'An unexpected error occurred',
    },
  };
  if (known && error.details) payload.error.details = error.details;
  return response.status(known ? error.status : 500).json(payload);
}

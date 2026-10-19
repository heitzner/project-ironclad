export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function errorMiddleware(error, _request, response, _next) {
  if (error instanceof HttpError) {
    return response.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    })
  }

  console.error(error)
  return response.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' },
  })
}

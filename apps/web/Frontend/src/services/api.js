const apiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '')

export class ApiRequestError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR', details } = {}) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export async function apiRequest(path, options = {}) {
  if (!apiBaseUrl) {
    throw new ApiRequestError('The booking service URL is not configured.', { code: 'API_URL_MISSING' })
  }

  let response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: { Accept: 'application/json', ...options.headers },
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiRequestError('The booking service could not be reached.')
  }

  const body = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null
  if (!response.ok) {
    throw new ApiRequestError(body?.error?.message ?? 'The booking request could not be completed.', {
      status: response.status,
      code: body?.error?.code ?? 'REQUEST_FAILED',
      details: body?.error?.details,
    })
  }
  return body
}

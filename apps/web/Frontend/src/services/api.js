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
    throw new ApiRequestError('The IronClad API URL is not configured.', {
      code: 'API_URL_MISSING',
    })
  }

  let response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        'x-ironclad-test-session': 'admin-demo',
        ...options.headers,
      },
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiRequestError('The IronClad API could not be reached. Confirm that the backend is running.')
  }

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : null
  if (!response.ok) {
    throw new ApiRequestError(payload?.error?.message || 'The IronClad API rejected the request.', {
      status: response.status,
      code: payload?.error?.code || 'REQUEST_FAILED',
      details: payload?.error?.details,
    })
  }
  if (!payload) throw new ApiRequestError('The IronClad API returned an invalid response.', {
    code: 'INVALID_RESPONSE',
  })
  return payload
}

export function jsonOptions(method, body) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

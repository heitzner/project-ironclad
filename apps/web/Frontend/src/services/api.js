export class ApiError extends Error {
  constructor(message, { code = 'REQUEST_FAILED', status = null, details = null, cause } = {}) {
    super(message, { cause })
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }

  get unavailable() {
    return this.code === 'CONNECTION_UNAVAILABLE' || this.code === 'OPERATION_UNAVAILABLE'
  }

  get conflict() {
    return this.status === 409 || this.status === 412
  }
}

export function unavailableOperation() {
  return new ApiError('This action is not connected yet. Please try again when the connection is available.', {
    code: 'OPERATION_UNAVAILABLE',
  })
}

function validRelativePath(path) {
  if (typeof path !== 'string' || !path.trim() || path !== path.trim()) return false
  try {
    const decoded = decodeURIComponent(path)
    return !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(decoded)
      && !/[\\#]/.test(decoded)
      && !Array.from(decoded).some((character) => character.charCodeAt(0) < 32)
      && !/(?:^|\/)\.{1,2}(?:\/|$|\?)/.test(decoded)
  } catch {
    return false
  }
}

// Adapters supply agreed relative paths; this module defines no backend endpoints.
export function createApiClient({ baseUrl = import.meta.env?.VITE_API_URL, fetchImpl = globalThis.fetch } = {}) {
  return {
    async request(path, { method = 'GET', json, signal, headers, credentials = 'same-origin' } = {}) {
      const base = typeof baseUrl === 'string' ? baseUrl.trim().replace(/\/+$/, '') : ''
      if (!base) {
        throw new ApiError('The service connection is not configured yet.', { code: 'CONNECTION_UNAVAILABLE' })
      }
      if (!validRelativePath(path)) {
        throw new ApiError('A valid relative service path is required.', { code: 'INVALID_PATH' })
      }
      const requestHeaders = new Headers(headers)
      requestHeaders.set('Accept', 'application/json')
      if (json !== undefined) requestHeaders.set('Content-Type', 'application/json')

      let response
      try {
        response = await fetchImpl(`${base}/${path.replace(/^\/+/, '')}`, {
          method, signal, headers: requestHeaders, credentials,
          body: json === undefined ? undefined : JSON.stringify(json),
        })
      } catch (cause) {
        if (signal?.aborted || cause?.name === 'AbortError') throw cause
        throw new ApiError('The service could not be reached. Please retry.', { code: 'NETWORK_ERROR', cause })
      }

      let data = null
      try {
        const text = await response.text()
        if (text) data = JSON.parse(text)
      } catch (cause) {
        if (signal?.aborted || cause?.name === 'AbortError') throw cause
        if (response.ok) {
          throw new ApiError('The service returned an unreadable response. Please retry.', {
            code: 'INVALID_RESPONSE', status: response.status, cause,
          })
        }
      }
      if (!response.ok) {
        throw new ApiError(
          response.status === 409 || response.status === 412
            ? 'This record has changed. Refresh it before trying again.'
            : 'The service could not complete this request. Please retry.',
          { code: 'HTTP_ERROR', status: response.status, details: data },
        )
      }
      return data
    },
  }
}

export const apiClient = createApiClient()

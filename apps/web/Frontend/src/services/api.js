const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export async function apiRequest(path, options = {}) {
  let response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        'x-ironclad-test-session': 'admin-demo',
        ...options.headers,
      },
    })
  } catch {
    throw new Error('The admin service could not be reached. Confirm that the backend is running.')
  }

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : null
  if (!response.ok) {
    const error = new Error(payload?.error?.message || 'The admin service rejected the request.')
    error.code = payload?.error?.code
    error.status = response.status
    throw error
  }
  if (!payload) throw new Error('The admin service returned an invalid response.')
  return payload
}

export function jsonOptions(method, body) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

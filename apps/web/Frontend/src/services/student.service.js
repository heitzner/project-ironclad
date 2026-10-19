import { apiClient } from './api.js'

// Student endpoints. Paths are relative; apiClient prefixes VITE_API_URL.
// Expected shapes: events -> Event[], archive -> { records, filters, summary },
// profile -> { profile, positionOptions }. Agree these with apps/server.
export const studentService = {
  getEvents: ({ signal } = {}) => apiClient.request('student/events', { signal }),
  getArchive: ({ signal } = {}) => apiClient.request('student/archive', { signal }),
  getProfile: ({ signal } = {}) => apiClient.request('student/profile', { signal }),
  updateProfile: (changes) => apiClient.request('student/profile', { method: 'PATCH', json: changes }),
}

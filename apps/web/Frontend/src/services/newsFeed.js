import { apiRequest } from './api.js'

export function getNewsFeed({ q = '', category = '', limit = 12, offset = 0, signal } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  if (q) params.set('q', q)
  if (category) params.set('category', category)

  return apiRequest(`/news-feed?${params.toString()}`, { signal })
}

export function getNewsPost(postId, { signal } = {}) {
  return apiRequest(`/news-feed/${encodeURIComponent(postId)}`, { signal })
}

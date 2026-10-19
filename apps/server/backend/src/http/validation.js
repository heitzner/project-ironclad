import { ApiError } from './ApiError.js'

const parseInteger = (value, field, fallback, { min, max }) => {
  if (value === undefined) return fallback
  if (!/^\d+$/.test(String(value))) {
    throw new ApiError(400, 'INVALID_QUERY', `${field} must be an integer.`)
  }

  const parsed = Number.parseInt(value, 10)
  if (parsed < min || parsed > max) {
    throw new ApiError(400, 'INVALID_QUERY', `${field} must be between ${min} and ${max}.`)
  }
  return parsed
}

export const parseFeedQuery = (query, categories) => {
  const q = typeof query.q === 'string' ? query.q.trim() : ''
  if (q.length > 100) {
    throw new ApiError(400, 'INVALID_QUERY', 'q must not exceed 100 characters.')
  }

  const category = typeof query.category === 'string' ? query.category.trim().toLowerCase() : ''
  if (category && !categories.includes(category)) {
    throw new ApiError(400, 'INVALID_QUERY', 'category is not supported.', { allowed: categories })
  }

  return {
    q,
    category,
    limit: parseInteger(query.limit, 'limit', 12, { min: 1, max: 50 }),
    offset: parseInteger(query.offset, 'offset', 0, { min: 0, max: 10000 }),
  }
}

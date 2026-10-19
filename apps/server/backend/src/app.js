import express from 'express'
import { config as defaultConfig } from './config.js'
import { newsFeedSeed } from './data/newsFeedSeed.js'
import { ApiError } from './http/ApiError.js'
import { parseFeedQuery } from './http/validation.js'
import { InMemoryNewsRepository } from './repositories/InMemoryNewsRepository.js'
import { NewsFeedService } from './services/NewsFeedService.js'

const isLocalDevelopmentOrigin = (origin) => {
  try {
    const url = new URL(origin)
    return ['localhost', '127.0.0.1'].includes(url.hostname) && ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}

export const createApp = ({ seed = newsFeedSeed, clientOrigins = defaultConfig.clientOrigins } = {}) => {
  const app = express()
  const repository = new InMemoryNewsRepository(seed)
  const service = new NewsFeedService(repository)

  app.disable('x-powered-by')
  app.use(express.json({ limit: '32kb' }))
  app.use((request, response, next) => {
    const origin = request.get('origin')
    if (origin && (clientOrigins.includes(origin) || isLocalDevelopmentOrigin(origin))) {
      response.set('Access-Control-Allow-Origin', origin)
      response.set('Vary', 'Origin')
      response.set('Access-Control-Allow-Headers', 'Content-Type')
      response.set('Access-Control-Allow-Methods', 'GET,OPTIONS')
    }
    if (request.method === 'OPTIONS') return response.sendStatus(204)
    next()
  })

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok', service: 'news-feed' })
  })

  app.get('/news-feed', (request, response, next) => {
    try {
      const categories = service.getCategories().map((category) => category.value)
      response.json(service.list(parseFeedQuery(request.query, categories)))
    } catch (error) {
      next(error)
    }
  })

  app.get('/news-feed/:postId', (request, response, next) => {
    try {
      response.json(service.getById(request.params.postId))
    } catch (error) {
      next(error)
    }
  })

  app.use((_request, _response, next) => {
    next(new ApiError(404, 'ROUTE_NOT_FOUND', 'API route was not found.'))
  })

  app.use((error, _request, response, _next) => {
    if (error instanceof ApiError) {
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
  })

  return app
}

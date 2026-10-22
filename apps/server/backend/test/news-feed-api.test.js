import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app.js'

let server
let baseUrl

before(async () => {
  server = createApp().listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
})

describe('news feed API', () => {
  it('returns posts and metadata sourced from the server', async () => {
    const response = await fetch(`${baseUrl}/news-feed`)
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(body.data.length, 6)
    assert.equal(body.meta.total_count, 6)
    assert.equal(body.meta.categories.reduce((sum, category) => sum + category.count, 0), 6)
    assert.equal(body.meta.dataset_label, 'Demo week')
    assert.equal(body.data[0].pinned, true)
  })

  it('searches post content case-insensitively', async () => {
    const response = await fetch(`${baseUrl}/news-feed?q=BADMINTON`)
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(body.meta.total_count, 1)
    assert.equal(body.data[0].post_id, 'demo-badminton-tryout')
  })

  it('applies category filtering and pagination on the server', async () => {
    const response = await fetch(`${baseUrl}/news-feed?category=advisories&limit=1&offset=1`)
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(body.meta.total_count, 2)
    assert.equal(body.data.length, 1)
    assert.equal(body.data[0].category, 'advisories')
    assert.equal(body.meta.has_more, false)
  })

  it('returns an individual post', async () => {
    const response = await fetch(`${baseUrl}/news-feed/demo-egames-tournament`)
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(body.data.title, 'Campus E-Games Tournament Registration')
  })

  it('returns 400 for invalid filters', async () => {
    const response = await fetch(`${baseUrl}/news-feed?category=unknown`)
    const body = await response.json()

    assert.equal(response.status, 400)
    assert.equal(body.error.code, 'INVALID_QUERY')
  })

  it('returns 404 when a post does not exist', async () => {
    const response = await fetch(`${baseUrl}/news-feed/missing-post`)
    const body = await response.json()

    assert.equal(response.status, 404)
    assert.equal(body.error.code, 'POST_NOT_FOUND')
  })
})

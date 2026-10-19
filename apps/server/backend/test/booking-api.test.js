import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { createApp } from '../src/app.js'

let server
let baseUrl

before(async () => {
  server = createApp().listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
})

const json = async (path, options) => {
  const response = await fetch(`${baseUrl}${path}`, options)
  return { status: response.status, body: await response.json() }
}

describe('student booking API', () => {
  it('filters venues by floor and searchable equipment', async () => {
    const result = await json('/venues?date=2026-10-20&period=all_day&floor=1&q=oscilloscopes')
    assert.equal(result.status, 200)
    assert.deepEqual(result.body.data.map((venue) => venue.room_code), ['Room 102'])
    assert.equal(result.body.meta.total_count, 1)
  })

  it('calculates booked-time utilization for the selected period', async () => {
    const result = await json('/venues?date=2026-10-20&period=all_day&q=Room%20101')
    assert.equal(result.body.data[0].utilization_percent, 67)
    const morning = await json('/venues?date=2026-10-20&period=morning&q=Room%20101')
    assert.equal(morning.body.data[0].utilization_percent, 67)
  })

  it('derives locked and available statuses', async () => {
    const result = await json('/venues?date=2026-10-20&period=all_day&floor=2')
    const byCode = Object.fromEntries(result.body.data.map((venue) => [venue.room_code, venue]))
    assert.equal(byCode['Room 203'].status, 'unavailable')
    assert.equal(byCode['Room 203'].status_label, 'Locked by Dean')
    assert.equal(byCode['Room 203'].utilization_percent, 0)
    assert.equal(byCode['Room 202'].status, 'available')
  })

  it('summary counts match the applied list filters', async () => {
    const result = await json('/venues?date=2026-10-20&period=all_day&floor=2&q=Network')
    assert.equal(result.body.meta.total_count, 1)
    assert.deepEqual(result.body.meta.summary, { available: 0, occupied: 0, unavailable: 1 })
    assert.equal(result.body.meta.floor_counts.floor_2, 1)
  })

  it('returns dates, requester configuration, and venue details', async () => {
    const dates = await json('/dates/options')
    assert.equal(dates.body.data.length, 6)
    assert.equal(dates.body.meta.default_date, '2026-10-20')
    const config = await json('/reservations/config')
    assert.equal(config.body.data.requester.studentId, '2022-10892')
    const details = await json('/venues/Room%20303?date=2026-10-20&period=evening')
    assert.deepEqual(details.body.data.free_windows, [{ start_time: '14:30', end_time: '18:00' }])
  })

  it('creates a pending request and rejects an overlapping request', async () => {
    const body = {
      room_code: 'Room 303',
      date: '2026-10-20',
      start_time: '14:30',
      end_time: '17:00',
      purpose: 'Student organization planning',
      student_id: '2022-10892',
    }
    const first = await json('/reservations/lock', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    assert.equal(first.status, 201)
    assert.equal(first.body.data.status, 'pending')
    const conflict = await json('/reservations/lock', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    assert.equal(conflict.status, 409)
    assert.equal(conflict.body.error.code, 'SLOT_CONFLICT')
  })

  it('rejects unavailable venues and missing venues', async () => {
    const base = { date: '2026-10-20', start_time: '13:00', end_time: '14:00', purpose: 'Testing', student_id: '2022-10892' }
    const locked = await json('/reservations/lock', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...base, room_code: 'Room 203' }) })
    assert.equal(locked.status, 422)
    const missing = await json('/reservations/lock', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...base, room_code: 'Room 999' }) })
    assert.equal(missing.status, 404)
  })
})

export const timeOptions = (start = 0, end = 1425, step = 15) => Array.from({ length: Math.floor((end - start) / step) + 1 }, (_, i) => { const m = start + i * step; return { value: String(m), label: `${String(Math.floor(m / 60) % 12 || 12).padStart(2, '0')}:${String(m % 60).padStart(2, '0')} ${m >= 720 ? 'PM' : 'AM'}` } })

export function isCalendarDate(value) { const milliseconds = Date.parse(`${value}T00:00:00Z`); return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(milliseconds) && new Date(milliseconds).toISOString().slice(0, 10) === value }

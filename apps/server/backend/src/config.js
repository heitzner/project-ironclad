const parseOrigins = (value) => (value ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export const config = Object.freeze({
  port: Number.parseInt(process.env.PORT ?? '3000', 10),
  clientOrigins: parseOrigins(process.env.CLIENT_ORIGINS),
  demoWeekStart: '2026-10-19',
  demoNow: '2026-10-20T14:15:00+08:00',
  timeZone: 'Asia/Manila',
  defaultStudentId: '2022-10892',
  purposeMaxLength: 200,
  minimumSlotMinutes: 30,
  periods: Object.freeze({
    morning: Object.freeze([{ start: '07:00', end: '12:00' }]),
    evening: Object.freeze([{ start: '13:00', end: '18:00' }]),
    all_day: Object.freeze([
      { start: '07:00', end: '12:00' },
      { start: '13:00', end: '18:00' },
    ]),
  }),
})

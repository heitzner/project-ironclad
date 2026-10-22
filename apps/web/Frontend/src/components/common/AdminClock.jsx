import { useEffect, useState } from 'react'

export default function AdminClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer) }, [])
  return <time dateTime={now.toISOString()} aria-label={`Manila time: ${now.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`} className="flex shrink-0 flex-col border-l border-navMuted/30 pl-2 text-right text-[9px] leading-4 text-navMuted">
    <span>{new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' }).format(now)}</span>
    <span className="font-semibold tabular-nums text-white">{new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: false }).format(now)} <span className="hidden sm:inline">PHT</span></span>
  </time>
}

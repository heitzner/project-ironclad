import { useEffect, useState } from 'react'
import { Clock3 } from 'lucide-react'

export default function AdminWorkspaceStatus({ preview }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-textSecondary">
      <span className="flex items-center gap-1.5 rounded-full bg-cardBg px-3 py-1 font-medium text-dark">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />
        {preview ? 'Design preview · No live accounts or records' : 'Administrator workspace'}
      </span>
      <time dateTime={now.toISOString()} className="flex items-center gap-1.5">
        <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
        {now.toLocaleString('en-PH', {
          timeZone: 'Asia/Manila',
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
      </time>
    </div>
  )
}

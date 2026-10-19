import { StatusBadge } from '../common/PageHeader.jsx'

export default function CouncilHeader({ council }) {
  return (
    <header className="flex min-w-0 flex-wrap items-center justify-between gap-6 rounded-panel bg-white px-[25px] py-4 wrap-anywhere shadow-card xl:gap-[218px]">
      {council?.logo && <img src={council.logo.src} alt={council.logo.alt ?? ''} className="h-36 w-36 shrink-0 rounded-full object-cover" />}
      <div className="min-w-0 flex-1 basis-64 break-words">
        <h1 className="text-[20px] font-semibold leading-7 tracking-[-0.5px] text-textPrimary">{council?.name ?? 'Council feed'}</h1>
        {council?.description && <p className="mt-0.5 text-[12px] leading-[18px] text-textSecondary">{council.description}</p>}
      </div>
      {council && <StatusBadge>{council.activeEventCount} Active {council.activeEventCount === 1 ? 'Event' : 'Events'}</StatusBadge>}
    </header>
  )
}

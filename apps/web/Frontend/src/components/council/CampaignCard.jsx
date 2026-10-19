import { useId } from 'react'
import ProgressBar from '../common/ProgressBar.jsx'
import CouncilFeedAction from './CouncilFeedAction.jsx'
import { formatCampaignSchedule, registrationProgress } from './councilFeed.model.js'
import mediaOverlay from './assets/ed922.svg'
import venueIcon from './assets/b8e80.svg'
import scheduleIcon from './assets/f2661.svg'
import individualOrganizerIcon from './assets/f8cbf.svg'
import teamOrganizerIcon from './assets/ae777.svg'
import individualVenueIcon from './assets/11fcf.svg'
import teamVenueIcon from './assets/c6855.svg'
import individualRegisterIcon from './assets/a566a.svg'
import teamRegisterIcon from './assets/c4ddf.svg'

export default function CampaignCard({ campaign, user, onViewVenue, onRegisterIndividual, onRegisterTeam, refreshFeed, actionReason }) {
  const titleId = useId()
  const team = campaign.registration?.kind === 'team'
  const progress = registrationProgress(campaign.registration)
  const schedule = formatCampaignSchedule(campaign.schedule)
  const crop = campaign.image?.crop
  const registrationLabel = campaign.registration?.actionLabel ?? (team ? 'Register Team' : 'Register individually')
  const venueReason = actionReason || (!campaign.venue ? 'Venue details are unavailable.'
    : campaign.actions?.viewVenue?.available !== true ? campaign.actions?.viewVenue?.reason ?? 'Venue details are not available for this campaign.' : undefined)
  const registerReason = actionReason || (!campaign.registration ? 'Registration details are unavailable.'
    : campaign.actions?.register?.available !== true ? campaign.actions?.register?.reason ?? 'Registration is not available for this campaign.' : undefined)

  return (
    <article aria-labelledby={titleId} className="min-w-0 overflow-hidden rounded-card bg-cardBg wrap-anywhere shadow-card">
      <div className="relative h-52 overflow-hidden bg-surfaceGray">
        {campaign.image ? <img src={campaign.image.src} alt={campaign.image.alt ?? ''}
          className={crop ? 'absolute w-full max-w-none' : 'h-full w-full object-cover'}
          style={crop ? { height: `${crop.heightPercent}%`, top: `${crop.topPercent}%`, left: `${crop.leftPercent}%` } : undefined}
        /> : <p className="p-4 text-[12px] text-textSecondary">Campaign image unavailable</p>}
        {team ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />
          : <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: `url(${mediaOverlay})`, backgroundSize: '100% 100%' }} />}
        {campaign.status && <span className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)] rounded-full bg-dark px-2.5 py-1 text-[10px] font-semibold leading-[14px] tracking-[0.5px] break-words text-white">{campaign.status.label}</span>}
        <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-start justify-between gap-2 text-[10px] leading-[14px] tracking-[0.5px] text-white">
          <span className="flex min-w-0 items-center gap-1 rounded-chip bg-deep px-2 py-1">
            <img src={venueIcon} alt="" className="shrink-0" /><span className="min-w-0 break-words">{campaign.venue?.name ?? 'Venue unavailable'}</span>
          </span>
          <span className="flex min-w-0 items-start gap-1 rounded-chip bg-dark px-2 py-1 font-semibold">
            <img src={scheduleIcon} alt="" className="shrink-0" /><span className="min-w-0 break-words">{schedule ?? 'Schedule unavailable'}</span>
          </span>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-2 p-4">
        {(campaign.category || campaign.tags?.length > 0) && <div className="flex flex-wrap gap-1.5 text-[10px] leading-[14px] tracking-[0.5px]">
          {campaign.category && <span className="min-w-0 max-w-full rounded-full bg-white px-2 py-0.5 font-bold break-words text-dark">{campaign.category.label}</span>}
          {campaign.tags?.map((tag, index) => <span key={`${tag}-${index}`} className={`min-w-0 max-w-full rounded-full px-2 py-0.5 break-words ${index === 0 ? 'bg-soft/20 font-semibold text-deep' : 'bg-white font-medium text-textSecondary'}`}>{tag}</span>)}
        </div>}
        <h2 id={titleId} className="text-[16px] font-bold leading-[22px] break-words text-textPrimary">{campaign.title}</h2>
        {campaign.description && <p className="whitespace-pre-line text-[13px] leading-5 break-words text-textSecondary">{campaign.description}</p>}
        <div className="flex flex-col gap-1 text-[10px] leading-[14px] tracking-[0.5px]">
          {progress ? <>
            <div className="flex flex-wrap justify-between gap-1 font-semibold text-deep">
              <span>{progress.label}</span><span>{Math.round(progress.percent)}% filled</span>
            </div>
            <ProgressBar value={progress.percent} label={`${campaign.title}: registration`} valueText={progress.label} />
          </> : <p className="text-textSecondary">Registration capacity unavailable</p>}
          {campaign.organizer && <p className="flex items-center gap-1 pt-1 font-medium text-textSecondary">
            <img src={team ? teamOrganizerIcon : individualOrganizerIcon} alt="" className="shrink-0" /><span className="min-w-0 break-words">Organizer: {campaign.organizer.name}</span>
          </p>}
        </div>
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2 border-t border-deep/10 pt-[5px]">
          <CouncilFeedAction variant="venue" size="compact" onAction={onViewVenue} subject={campaign} scope={user} disabledReason={venueReason} label={`View venue details for ${campaign.title}`}>
            <img src={team ? teamVenueIcon : individualVenueIcon} alt="" className="shrink-0" />View Venue Details
          </CouncilFeedAction>
          <CouncilFeedAction size="compact" onAction={team ? onRegisterTeam : onRegisterIndividual} subject={campaign} scope={user} refreshFeed={refreshFeed} disabledReason={registerReason} label={`${registrationLabel} for ${campaign.title}`}>
            <img src={team ? teamRegisterIcon : individualRegisterIcon} alt="" className="shrink-0" />{registrationLabel}
          </CouncilFeedAction>
        </div>
      </div>
    </article>
  )
}

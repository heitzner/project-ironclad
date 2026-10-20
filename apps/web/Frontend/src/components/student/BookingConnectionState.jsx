import { RefreshCw, WifiOff } from 'lucide-react'

export default function BookingConnectionState({ loading, error, onRetry }) {
  const Icon = loading ? RefreshCw : WifiOff
  return (
    <main className="mx-auto grid min-h-[60svh] w-full max-w-content place-items-center px-6 pt-20 text-center">
      <div className="max-w-lg rounded-card bg-white p-8 shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cardBg text-primary" aria-hidden="true">
          <Icon className={`h-7 w-7 ${loading ? 'animate-spin' : ''}`} />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-textPrimary">{loading ? 'Loading room bookings' : 'Unable to load room bookings'}</h1>
        <p className="mt-2 text-sm leading-6 text-textSecondary">{loading ? 'Connecting to the student booking service.' : error?.message}</p>
        {!loading && (
          <button type="button" onClick={onRetry} className="mt-4 rounded-control bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Retry
          </button>
        )}
      </div>
    </main>
  )
}

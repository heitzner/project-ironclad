import { useRef, useState } from 'react'
import { Camera, Trash2, Upload, User } from 'lucide-react'

export function AvatarCard({ avatarUrl, onAvatarChanged }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // UX validation: JPG/PNG and <= 5MB
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg']
    if (!validTypes.includes(file.type)) {
      setError('Allowed formats: JPG, PNG only.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be 5MB or less.')
      return
    }

    setError(null)
    setLoading(true)

    // Client-side local preview using FileReader
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result
      setLoading(false)
      onAvatarChanged?.(dataUrl)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    reader.readAsDataURL(file)
  }

  const handleRemove = () => {
    setError(null)
    onAvatarChanged?.('')
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-card border border-track/30">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative shrink-0">
          <div className="flex h-[112px] w-[112px] items-center justify-center rounded-full p-1 bg-gradient-to-tr from-dark via-primary to-soft shadow-sm">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Custom Profile Avatar"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-14 w-14 text-textMuted stroke-[1.5]" aria-hidden="true" />
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            aria-label="Change avatar"
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-dark text-white shadow-card transition-colors duration-150 hover:bg-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileChange}
            className="sr-only"
            aria-hidden="true"
          />
        </div>

        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-[16px] font-bold text-textPrimary">Custom Profile Avatar</h2>
          <p className="mt-1 text-[12px] leading-5 text-textSecondary">
            Allowed formats: JPG, PNG (Max 5MB). This photo will be used for your generated campaign overlays and venue booking identification.
          </p>

          {error && (
            <p role="alert" className="mt-2 text-[12px] font-medium text-error">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-soft px-4 py-2 text-[12px] font-semibold text-deep transition-colors duration-150 hover:bg-soft/80 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{loading ? 'Processing...' : 'Upload New Image'}</span>
            </button>

            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-surfaceGray px-3.5 py-2 text-[12px] font-semibold text-textSecondary transition-colors duration-150 hover:bg-surfaceGray/70 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AvatarCard

// Maps a { status, data } resource to a ViewState name, or null when content can render.
export function resourceState({ status, data }, isEmpty) {
  if (status === 'loading' && data == null) return 'loading'
  if (status === 'unavailable' || status === 'error') return status
  if (status === 'success' && isEmpty) return 'empty'
  return null
}

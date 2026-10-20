import { useEffect, useRef, useState } from 'react'

export default function useStudentDownload(operation) {
  const controller = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  useEffect(() => () => { controller.current?.abort() }, [])
  const run = async input => {
    if (controller.current && !controller.current.signal.aborted) return
    const current = new AbortController()
    controller.current = current
    setBusy(true)
    setError(null)
    try {
      const { blob, fileName } = await operation(input, { signal: current.signal })
      if (current.signal.aborted) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName.replace(/[/\\]/g, '_')
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (cause) {
      if (!current.signal.aborted) setError(cause?.message || 'The download could not be loaded.')
    } finally {
      if (!current.signal.aborted) { setBusy(false); controller.current = null }
    }
  }
  return { run, busy, error }
}

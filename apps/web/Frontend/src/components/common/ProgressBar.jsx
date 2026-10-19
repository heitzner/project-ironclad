function ProgressBar({ value = 0 }) {
  const progress = Math.min(100, Math.max(0, Number(value) || 0))

  return (
    <div
      role="progressbar"
      aria-label="Progress"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 overflow-hidden rounded-full bg-track"
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

export default ProgressBar

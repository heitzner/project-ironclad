const files = import.meta.glob('./assets/*.{svg,png}', { eager: true, query: '?url', import: 'default' })

// SVGs retain their original root dimensions. Wrappers position, never stretch, them.
export default function BookingIcon({ name, className = '' }) {
  return <span className={`booking-icon ${className}`} aria-hidden="true"><img src={files[`./assets/${name}.svg`]} alt="" /></span>
}

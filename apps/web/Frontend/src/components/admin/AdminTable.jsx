export default function AdminTable({ label, columns, children, emptyState }) {
  return <div className="min-w-0 overflow-hidden rounded-panel border border-track bg-white shadow-card" role="region" aria-label={label}>
    <div className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary" tabIndex={0}>
    <table className="w-full border-collapse text-left text-xs">
      <caption className="sr-only">{label}</caption>
      <thead className="bg-selectBg text-textSecondary"><tr>{columns.map(column => <th scope="col" key={column} className="whitespace-nowrap border-b border-track px-4 py-3 text-[10px] font-semibold uppercase tracking-wide">{column}</th>)}</tr></thead>
      <tbody className="divide-y divide-track">{children}</tbody>
    </table>
    </div>
    {emptyState}
  </div>
}

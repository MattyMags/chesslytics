interface StatCardProps {
  label: string
  value: string
  hint?: string
  accent?: 'win' | 'loss' | 'draw' | 'neutral'
}

export function StatCard({ label, value, hint, accent = 'neutral' }: StatCardProps) {
  return (
    <div className={`stat-card stat-card--${accent}`}>
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
      {hint && <span className="stat-card__hint">{hint}</span>}
    </div>
  )
}

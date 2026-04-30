import { COLOR_ACCENT, COLOR_SUCCESS, COLOR_WARNING, COLOR_ERROR } from './incidentConstants'

export function KpiCard({ label, value, unit = '', accent = false, sub = '' }) {
  return (
    <div className={`inc__kpi-card${accent ? ' inc__kpi-card--accent' : ''}`}>
      <span className="inc__kpi-label">{label}</span>
      <span className="inc__kpi-value">
        {value}<span className="inc__kpi-unit">{unit}</span>
      </span>
      {sub && <span className="inc__kpi-sub">{sub}</span>}
    </div>
  )
}

export function AvailabilityBadge({ value }) {
  const color = value >= 99.9 ? COLOR_SUCCESS : value >= 99 ? COLOR_WARNING : COLOR_ERROR
  return (
    <div className="inc__avail-badge" style={{ borderColor: color }}>
      <span className="inc__avail-value" style={{ color }}>{value}%</span>
      <span className="inc__avail-label">Service Availability</span>
      <span className="inc__avail-sub" style={{ color }}>
        {value >= 99.9 ? '✔ Target met' : value >= 99 ? '⚠ Near threshold' : '✖ Below SLA'}
      </span>
    </div>
  )
}

export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="inc__tooltip">
      {label && <p className="inc__tooltip-label">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || COLOR_ACCENT }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

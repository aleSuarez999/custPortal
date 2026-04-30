// ── Paleta del proyecto ───────────────────────────────────────────────────────
export const COLOR_ACCENT    = '#00d4ff'
export const COLOR_SECONDARY = '#3b82f6'
export const COLOR_SUCCESS   = '#10b981'
export const COLOR_WARNING   = '#f59e0b'
export const COLOR_ERROR     = '#ef4444'
export const COLOR_MUTED     = '#64748b'

export const SEVERITY_COLORS = {
  critical: COLOR_ERROR,
  high:     '#f97316',
  medium:   COLOR_WARNING,
  low:      COLOR_SUCCESS,
}

export const WORK_STATUS_CFG = {
  active:      { label: 'Active',      color: COLOR_ERROR,     bg: 'rgba(239,68,68,0.10)'  },
  in_progress: { label: 'In Progress', color: COLOR_WARNING,   bg: 'rgba(245,158,11,0.12)' },
  resolved:    { label: 'Resolved',    color: COLOR_SUCCESS,   bg: 'rgba(16,185,129,0.10)' },
  suspended:   { label: 'Suspended',   color: COLOR_MUTED,     bg: 'rgba(100,116,139,0.10)' },
}

export const TYPE_COLORS    = [COLOR_ACCENT, COLOR_SECONDARY, COLOR_SUCCESS, COLOR_WARNING, COLOR_ERROR, '#8b5cf6', '#ec4899']
export const PERIOD_OPTIONS = [1, 7, 14, 30, 60, 90]
export const LS_ORG_KEY     = 'inc_mgmnt_last_org'

export const fmtDate = d => new Date(d).toLocaleString('en-GB', {
  day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
})

export const toDatetimeLocal = d => {
  if (!d) return ''
  const dt = new Date(d)
  const pad = n => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}

export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0m'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

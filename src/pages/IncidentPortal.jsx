import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts'
import {
  getIncidentReport,
  getIncidentOrgs,
  updateIncidentWorkStatus,
  bulkAssignClaim,
  toggleIncidentSLA,
  getResolvedIncidentsReport, getIncidentNetworkDetail,
  deleteIncident,
  getRecurrenceReport,
} from '../utils/api'
import Text from '../components/Text'
import IncidentWanDetail from '../components/incidents/IncidentWanDetail'

// ── Paleta del proyecto ───────────────────────────────────────────────────────
const COLOR_ACCENT    = '#00d4ff'
const COLOR_SECONDARY = '#3b82f6'
const COLOR_SUCCESS   = '#10b981'
const COLOR_WARNING   = '#f59e0b'
const COLOR_ERROR     = '#ef4444'
const COLOR_MUTED     = '#64748b'

const SEVERITY_COLORS = {
  critical: COLOR_ERROR,
  high:     '#f97316',
  medium:   COLOR_WARNING,
  low:      COLOR_SUCCESS,
}

const WORK_STATUS_CFG = {
  active:      { label: 'Active',      color: COLOR_ERROR,     bg: 'rgba(239,68,68,0.10)'  },
  in_progress: { label: 'In Progress', color: COLOR_WARNING,   bg: 'rgba(245,158,11,0.12)' },
  resolved:    { label: 'Resolved',    color: COLOR_SUCCESS,   bg: 'rgba(16,185,129,0.10)' },
  suspended:   { label: 'Suspended',   color: COLOR_MUTED,     bg: 'rgba(100,116,139,0.10)' },
}

const TYPE_COLORS  = [COLOR_ACCENT, COLOR_SECONDARY, COLOR_SUCCESS, COLOR_WARNING, COLOR_ERROR, '#8b5cf6', '#ec4899']
const PERIOD_OPTIONS = [7, 14, 30, 60, 90]
const LS_ORG_KEY     = 'inc_mgmnt_last_org'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = d => new Date(d).toLocaleString('en-GB', {
  day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
})

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0m'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, unit = '', accent = false, sub = '' }) {
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

// ── Availability badge ────────────────────────────────────────────────────────
function AvailabilityBadge({ value }) {
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

// ── Custom Tooltip recharts ───────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
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

// ── Fila editable de incidente abierto ────────────────────────────────────────
function OpenIncidentRow({ inc, onSave, onToggleSLA, onNewIncident, selected, onToggleSelect, orgName }) {
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [ws, setWs] = useState(inc.workStatus || 'active')
  const [claim, setClaim] = useState(inc.claimNumber || '')
  const [notes, setNotes] = useState(inc.resolutionNotes || '')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const handleWsChange = v => { setWs(v); setDirty(true) }
  const handleClaimChange = v => { setClaim(v); setDirty(true) }
  const handleNotesChange = v => { setNotes(v); setDirty(true) }

  const toggleExpand = async () => {
    const next = !expanded
    setExpanded(next)

    // Lazy load: solo al abrir y si no está cargado
    if (next && !detail) {
      try {
        setLoadingDetail(true)
        const d = await getIncidentNetworkDetail(inc.orgId, inc.networkId)
        setDetail(d)
      } catch (err) {
        console.error('WAN detail error:', err.message)
      } finally {
        setLoadingDetail(false)
      }
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const ok = await onSave(inc._id, { workStatus: ws, claimNumber: claim, resolutionNotes: notes })
    setSaving(false)
    if (ok !== false) setDirty(false)
  }

  const cfg = WORK_STATUS_CFG[ws] || WORK_STATUS_CFG.active
  const rowStyle =
    ws === 'suspended'
      ? { opacity: 0.45, filter: 'grayscale(0.6)', borderLeft: '3px solid #475569' }
      : ws === 'in_progress'
      ? { background: 'rgba(245,158,11,0.07)', borderLeft: `3px solid ${COLOR_WARNING}` }
      : {}

  return (
    <>
      {/* Fila principal */}
      <tr
        onClick={toggleExpand}
        style={{ cursor: 'pointer', ...rowStyle }} >

        <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center', paddingRight: '0.25rem' }}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(inc._id)}
            style={{ cursor: 'pointer', accentColor: COLOR_ACCENT }}
          />
        </td>

        <td  className="inc__td-mono" style={{ color: COLOR_MUTED, fontSize: '0.75rem', textAlign: 'center' }}>
          {expanded ? '▾' : '▸'}
        </td>

        <td>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span className="inc__badge" style={{
              background: (SEVERITY_COLORS[inc.severity] || COLOR_MUTED) + '22',
              color: SEVERITY_COLORS[inc.severity] || COLOR_MUTED,
              border: `1px solid ${SEVERITY_COLORS[inc.severity] || COLOR_MUTED}44`
            }}>
              {inc.severity}
            </span>
            <span style={{ fontSize: '0.65rem', color: '#64748b', fontFamily: 'monospace' }}>
              {inc.incidentType === 'DEVICE_OFFLINE' ? 'offline' : inc.uplinkInterface || inc.incidentType}
            </span>
          </div>
        </td>

        <td className="inc__td-mono">
          {inc.networkName || inc.networkId || '—'}
          {orgName && (
            <span style={{ display: 'block', fontSize: '0.65rem', color: COLOR_MUTED, marginTop: '0.1rem' }}>
              {orgName}
            </span>
          )}
        </td>

        <td  className="inc__td-mono" >{inc.deviceSerial || '—'}</td>
      <td>
        {inc.uplinkInterface
          ? <span className="inc__badge" style={{
              background: 'rgba(0,212,255,0.08)',
              color: '#00d4ff',
              border: '1px solid rgba(0,212,255,0.3)',
              fontFamily: 'monospace',
              fontSize: '0.72rem',
            }}>
              {inc.uplinkInterface}
            </span>
          : <span style={{ color: '#64748b' }}>—</span>
        }
      </td>
        <td  className="inc__td-mono">{fmtDate(inc.detectedAt)}</td>

        {/* Selector estado */}
        <td  className="inc__td-mono" onClick={e => e.stopPropagation()}>
          <select className="inc__ws-select"
            value={ws}
            onChange={e => handleWsChange(e.target.value)}
            style={{ color: cfg.color, borderColor: cfg.color + '88', background: cfg.bg }}
          >
            <option value="active">Active</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="suspended">Suspended</option>
          </select>
        </td>

        {/* Claim */}
        <td  className="inc__td-mono" onClick={e => e.stopPropagation()}>
          <input
            className="inc__claim-input"
            type="text"
            placeholder="Nro reclamo"
            value={claim}
            onChange={e => handleClaimChange(e.target.value)}
          />
        </td>

        {/* Notes */}
        <td className="inc__td-mono" onClick={e => e.stopPropagation()}>
          <input
            className="inc__claim-input"
            type="text"
            placeholder="Motivo / notas"
            value={notes}
            onChange={e => handleNotesChange(e.target.value)}
            style={{ minWidth: 90, maxWidth: 160 }}
          />
        </td>

        {/* Toggle SLA */}
        <td className="inc__td-mono" onClick={e => e.stopPropagation()}>
          <button
            title={inc.countsSLA ? 'Cuenta para SLA — click para desactivar' : 'No cuenta para SLA — click para activar'}
            onClick={() => onToggleSLA(inc._id, !inc.countsSLA)}
            style={{
              fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: 4,
              border: `1px solid ${inc.countsSLA ? '#10b98166' : '#64748b44'}`,
              background: inc.countsSLA ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.08)',
              color: inc.countsSLA ? '#10b981' : '#64748b',
              cursor: 'pointer', fontWeight: 600,
            }}
          >
            SLA
          </button>
        </td>

        {/* Guardar */}
        <td  className="inc__td-mono" onClick={e => e.stopPropagation()}>
          <button style={{ padding: '0.25rem 0.6rem' }}
          className="btn btn__secondary btn__outline"
            onClick={handleSave}
            disabled={!dirty}
            title="Guardar"
          >
            {saving ? '…' : '✔'}
          </button>
        </td>
      </tr>

      {/* Fila expandida */}
      {expanded && (
        <tr>
          <td />
          <td colSpan={10} style={{ padding: '0.75rem 0.5rem 0.75rem 0' }}>
            <div
              style={{
                background: 'rgba(0,0,0,0.15)',
                borderRadius: 6,
                padding: '0.75rem 1rem',
                animation: 'inc-expand 0.18s ease',
              }}
            >
              {loadingDetail ? (
                <div className="inc__loading">Cargando WAN…</div>
              ) : (
                <IncidentWanDetail
                  detail={detail}
                  inc={inc}
                  onManualIncidentCreated={onNewIncident}
                />
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Tabla incidentes abiertos ─────────────────────────────────────────────────
function OpenIncidentsTable({ rows, onSave, onBulkClaim, onToggleSLA, onNewIncident, orgs, showOrg }) {
  const [selected, setSelected] = useState([])
  const [bulkClaim, setBulkClaim] = useState('')
  const [bulkStatus, setBulkStatus] = useState('in_progress')
  const [saving, setSaving] = useState(false)

  const toggleSelect = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const toggleAll = () =>
    setSelected(prev => prev.length === rows.length ? [] : rows.map(r => r._id))

  const handleBulkSave = async () => {
    if (!bulkClaim.trim() || selected.length === 0) return
    setSaving(true)
    const modified = await onBulkClaim(selected, bulkClaim.trim(), bulkStatus)
    if (modified !== null) {
      setSelected([])
      setBulkClaim('')
    }
    setSaving(false)
  }

  if (!rows || rows.length === 0)
    return <p className="inc__empty">No open incidents for this organization</p>

  return (
    <>
      {/* ── Panel bulk-claim (solo visible cuando hay selección) ── */}
      {selected.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
          background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.25)',
          borderRadius: 6, padding: '0.6rem 1rem', marginBottom: '0.75rem',
        }}>
          <span style={{ color: COLOR_ACCENT, fontWeight: 600, fontSize: '0.82rem' }}>
            {selected.length} incidente{selected.length > 1 ? 's' : ''} seleccionado{selected.length > 1 ? 's' : ''}
          </span>
          <input
            className="inc__claim-input"
            type="text"
            placeholder="Nro reclamo común"
            value={bulkClaim}
            onChange={e => setBulkClaim(e.target.value)}
            style={{ minWidth: 140 }}
          />
          <select
            className="inc__ws-select"
            value={bulkStatus}
            onChange={e => setBulkStatus(e.target.value)}
            style={{ color: WORK_STATUS_CFG[bulkStatus]?.color, borderColor: WORK_STATUS_CFG[bulkStatus]?.color + '88', background: WORK_STATUS_CFG[bulkStatus]?.bg }}
          >
            <option value="active">Active</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="suspended">Suspended</option>
          </select>
          <button
            className="btn btn__secondary btn__outline"
            onClick={handleBulkSave}
            disabled={!bulkClaim.trim() || saving}
            style={{ padding: '0.25rem 0.75rem' }}
          >
            {saving ? '…' : 'Asignar a seleccionados'}
          </button>
          <button
            style={{ background: 'none', border: 'none', color: COLOR_MUTED, cursor: 'pointer', fontSize: '0.8rem' }}
            onClick={() => setSelected([])}
          >
            Cancelar
          </button>
        </div>
      )}

      <div className="inc__table-wrap">
        <table className="inc__table">
          <thead>
            <tr>
              <th style={{ width: 32 }}>
                <input
                  type="checkbox"
                  checked={selected.length === rows.length && rows.length > 0}
                  onChange={toggleAll}
                  style={{ cursor: 'pointer', accentColor: COLOR_ACCENT }}
                />
              </th>
              <th>S</th>
              <th>Severity</th>
              <th>Network</th>
              <th>Device</th>
              <th>WAN</th>
              <th>Detected</th>
              <th>Status</th>
              <th>Claim #</th>
              <th>Notes</th>
              <th>SLA</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <OpenIncidentRow
                key={r._id}
                inc={r}
                onSave={onSave}
                onToggleSLA={onToggleSLA}
                onNewIncident={onNewIncident}
                selected={selected.includes(r._id)}
                onToggleSelect={toggleSelect}
                orgName={showOrg ? (orgs?.find(o => o.id === r.orgId)?.name ?? '') : ''}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── Tabla reporte resueltos ───────────────────────────────────────────────────
function ResolvedReportTable({ data, onDelete, onToggleSLA }) {
  if (!data) return null
  const { summary, incidents } = data

  // Solo incidentes cerrados manualmente — los auto-recuperados van a Reincidencias
  const manualIncidents = incidents.filter(r => !r.resolvedAt)

  return (
    <div className="inc__panel">
      <Text as="h3" className="inc__panel-title">
        Resolved Incidents Report
        <span className="inc__badge inc__badge--count">{manualIncidents.length}</span>
      </Text>

      {/* Métricas — solo cuentan incidentes con countsSLA:true */}
      <div className="inc__kpi-row" style={{ marginBottom: '1rem' }}>
        <KpiCard label="Total Resolved"   value={manualIncidents.length} accent />
        <KpiCard label="SLA Downtime"     value={summary.totalDowntimeHuman} sub="solo incidentes SLA" />
        <KpiCard label="Avg SLA Downtime" value={summary.avgDowntimeHuman}   sub="por evento SLA" />
        <KpiCard label="Max SLA Downtime" value={summary.maxDowntimeHuman}   sub="evento único" />
      </div>

      {manualIncidents.length === 0
        ? <p className="inc__empty">No hay incidentes cerrados manualmente en este período</p>
        : (
          <div className="inc__table-wrap">
            <table className="inc__table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Network</th>
                  <th>Device</th>
                  <th>LinkDown</th>
                  <th>Resuelto</th>
                  <th>Downtime</th>
                  <th title="¿Este incidente acumula tiempo de SLA?">SLA</th>
                  <th title="MTTR contractual: 8hs">MTTR</th>
                  <th>Claim #</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {manualIncidents.map((r, i) => (
                  <tr key={r._id || i} style={r.isDuplicateInGroup ? { opacity: 0.6 } : {}}>
                    <td><span className="inc__badge inc__badge--type">{r.incidentType}</span></td>
                    <td className="inc__td-mono">{r.networkName || r.networkId || '—'}</td>
                    <td className="inc__td-mono">{r.deviceSerial || '—'}</td>
                    <td className="inc__td-mono">{fmtDate(r.detectedAt)}</td>
                    <td className="inc__td-mono">
                      {r.effectiveResolvedAt ? fmtDate(r.effectiveResolvedAt) : '—'}
                    </td>
                    <td>
                      {r.isDuplicateInGroup
                        ? <span style={{ fontSize: '0.68rem', color: '#64748b', fontStyle: 'italic' }}
                            title="Mismo equipo y claim — downtime ya contabilizado en el vínculo principal">
                            ↳ mismo equipo
                          </span>
                        : r.countsSLA
                          ? <span
                              className="inc__badge"
                              style={{
                                background: r.downtimeMinutes > 60 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                                color:      r.downtimeMinutes > 60 ? COLOR_ERROR : COLOR_WARNING,
                                border:     `1px solid ${r.downtimeMinutes > 60 ? COLOR_ERROR : COLOR_WARNING}44`
                              }}
                            >
                              {r.downtimeHuman}
                            </span>
                          : <span style={{ color: COLOR_MUTED, fontSize: '0.72rem' }}>—</span>
                      }
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        title={r.countsSLA ? 'Cuenta SLA — click para desactivar' : 'No cuenta SLA — click para activar'}
                        onClick={() => onToggleSLA?.(r._id, !r.countsSLA)}
                        style={{
                          fontSize: '0.7rem', fontWeight: 700,
                          padding: '0.15rem 0.45rem', borderRadius: 4,
                          cursor: 'pointer', border: '1px solid',
                          transition: 'all 0.15s',
                          background:   r.countsSLA ? 'rgba(239,68,68,0.15)' : 'rgba(100,116,139,0.1)',
                          color:        r.countsSLA ? '#ef4444' : '#475569',
                          borderColor:  r.countsSLA ? '#ef444444' : '#47556933',
                        }}
                      >
                        {r.countsSLA ? 'SLA' : '—'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {(() => {
                        if (r.isDuplicateInGroup || !r.downtimeMinutes || !r.countsSLA)
                          return <span style={{ color: '#475569', fontSize: '0.68rem' }}>—</span>
                        const now = new Date()
                        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                        const periodMin = Math.round((now - monthStart) / 60000)
                        const unavailPct = ((r.downtimeMinutes / periodMin) * 100).toFixed(2)
                        const ok = r.downtimeMinutes <= 480
                        return (
                          <span
                            title={`${r.downtimeHuman} sobre ${Math.round(periodMin/60/24)} días del mes → ${unavailPct}% indisponibilidad${ok ? '' : ' — incumple MTTR contractual (8hs)'}`}
                            style={{ fontSize: '0.72rem', fontWeight: 700, color: ok ? '#10b981' : '#ef4444' }}
                          >
                            {ok ? '✔' : `${unavailPct}%`}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="inc__td-mono">{r.claimNumber || '—'}</td>
                    <td style={{ textAlign: 'center', padding: '0 0.4rem' }}>
                      <button
                        title="Eliminar registro"
                        onClick={() => onDelete?.(r._id, r)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#475569', padding: '0.2rem',
                          lineHeight: 1, fontSize: '0.9rem',
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = '#475569'}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  )
}

// ── Tabla reincidencias ───────────────────────────────────────────────────
function RecurrenceTable({ data }) {
  if (!data) return <p className="inc__empty">No hay datos de reincidencias para este período.</p>

  const networks = data.networks ?? data.recurrences ?? []

  if (networks.length === 0)
    return <p className="inc__empty">Sin reincidencias en el período seleccionado.</p>

  return (
    <div className="inc__panel">
      <Text as="h3" className="inc__panel-title">
        Reincidencias — caídas recuperadas automáticamente
        <span className="inc__badge inc__badge--count">{networks.length}</span>
      </Text>
      <p className="inc__table-hint">
        Sitios con más de una caída que se restableció sola en el período. No incluye incidentes cerrados manualmente.
      </p>
      <div className="inc__table-wrap">
        <table className="inc__table">
          <thead>
            <tr>
              <th>Network</th>
              <th style={{ textAlign: 'center' }}>Caídas</th>
              <th>Downtime total</th>
            </tr>
          </thead>
          <tbody>
            {networks.map((n, i) => (
              <tr key={n.networkId || n._id || i}>
                <td className="inc__td-mono">{n.networkName || '—'}</td>
                <td style={{ textAlign: 'center' }}>
                  <span className="inc__badge" style={{
                    background: (n.count ?? n.occurrences ?? 0) >= 5
                      ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                    color: (n.count ?? n.occurrences ?? 0) >= 5 ? COLOR_ERROR : COLOR_WARNING,
                    border: `1px solid ${(n.count ?? n.occurrences ?? 0) >= 5 ? COLOR_ERROR : COLOR_WARNING}44`,
                    fontWeight: 700,
                  }}>
                    {n.count ?? n.occurrences ?? '—'}
                  </span>
                </td>
                <td className="inc__td-mono">
                  {n.totalDowntimeHuman ?? n.downtimeHuman ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Selector de organización ──────────────────────────────────────────────────
function OrgSelector({ orgs, value, onChange }) {
  return (
    <div className="inc__org-selector">
      <label className="inc__period-label">Organization:</label>
      <select
        className="inc__org-select"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="ALL">Ver todas</option>
        {orgs.map(o => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function IncidentManagement() {
  const [orgs, setOrgs]               = useState([])
  const [selectedOrg, setSelectedOrg] = useState('')
  const [data, setData]               = useState(null)
  const [resolvedData, setResolvedData]       = useState(null)
  const [recurrenceData, setRecurrenceData]   = useState(null)
  const [loading, setLoading]                 = useState(false)
  const [loadingResolved, setLoadingResolved] = useState(false)
  const [loadingRecurrence, setLoadingRecurrence] = useState(false)
  const [error, setError]                     = useState(null)
  const [days, setDays]                       = useState(7)
  const [activeTab, setActiveTab]             = useState('open')   // 'open' | 'resolved' | 'recurrence'

  // ── Cargar lista de orgs al montar ────────────────────────────────────────
  /*
  useEffect(() => {
    getIncidentOrgs().then(list => {
      if (!list || list.length === 0) return
      setOrgs(list)
      // Restaurar última org seleccionada o usar la primera
      const last = localStorage.getItem(LS_ORG_KEY)
      const found = list.find(o => o.id === last)
      setSelectedOrg(found ? found.id : list[0].id)
    })
  }, [])
*/

const fetchData = async () => {
  if (!selectedOrg) return

  setLoading(true)
  setError(null)

  try {
    let incidentData = null
    let resolvedDataTmp = null

    // 🔥 CASO ALL
    if (selectedOrg === 'ALL') {
      if (orgs.length === 0) return

      const results = await Promise.all(
        orgs.map(o => getIncidentReport(o.id, days))
      )

      incidentData = {
        ...results[0],
        recentOpen: results.flatMap(r => r?.recentOpen || []),
        kpis: {
          ...results[0]?.kpis,
          openIncidents: results.reduce(
            (acc, r) => acc + (r?.kpis?.openIncidents || 0),
            0
          )
        }
      }

      // resolved también
      if (activeTab === 'resolved') {
        const resolvedResults = await Promise.all(
          orgs.map(o => getResolvedIncidentsReport(o.id, days))
        )

        resolvedDataTmp = {
          summary: {
            total: resolvedResults.reduce(
              (acc, r) => acc + (r?.summary?.total || 0),
              0
            )
          },
          incidents: resolvedResults.flatMap(r => r?.incidents || [])
        }
      }

    } else {
      // 🔹 UNA ORG
      incidentData = await getIncidentReport(selectedOrg, days)

      if (activeTab === 'resolved') {
        resolvedDataTmp = await getResolvedIncidentsReport(selectedOrg, days)
      }
    }

    setData(incidentData)

    if (resolvedDataTmp) {
      setResolvedData(resolvedDataTmp)
    }

  } catch (err) {
    setError('Connection error.')
  } finally {
    setLoading(false)
  }
}


  useEffect(() => {
  getIncidentOrgs().then(list => {
    if (!list || list.length === 0) return

    setOrgs(list)
    setSelectedOrg('ALL') // 👈 default
  })
}, [])

  // ── Persistir org seleccionada ─────────────────────────────────────────────
  useEffect(() => {
    if (selectedOrg) localStorage.setItem(LS_ORG_KEY, selectedOrg)
  }, [selectedOrg])
/*
useEffect(() => {
  if (!selectedOrg) return

  const interval = setInterval(() => {
    // refresca lo mismo que ya usás
    getIncidentReport(selectedOrg, days).then(setData)
    
    if (activeTab === 'resolved') {
      getResolvedIncidentsReport(selectedOrg, days).then(setResolvedData)
    }
    console.log("reconsultando")
  }, 30000) // 5 minutos = 300000 ms

  return () => clearInterval(interval)
}, [selectedOrg, days, activeTab])

AUTO REFRESH REFACTORIZADO
*/
useEffect(() => {
  if (!selectedOrg) return

  const interval = setInterval(() => {
    fetchData()
    console.log("reconsultando")
  }, 300000) // 5 min

  return () => clearInterval(interval)
}, [selectedOrg, days, activeTab, orgs])

  // ── Cargar reporte principal cuando cambia org o período ─────────────────
  /*
  useEffect(() => {
    if (!selectedOrg) return
    setLoading(true)
    setError(null)
    getIncidentReport(selectedOrg, days)
      .then(resp => {
        if (resp) setData(resp)
        else setError('Could not load incident data.')
      })
      .catch(() => setError('Connection error.'))
      .finally(() => setLoading(false))
  }, [selectedOrg, days])
*/
  // es el anterior refactorizado
  useEffect(() => {
    fetchData()
  }, [selectedOrg, days, activeTab, orgs])

  // ── Cargar reporte de resueltos cuando se activa esa pestaña ─────────────
  useEffect(() => {
    if (activeTab !== 'resolved' || !selectedOrg) return
    setLoadingResolved(true)
    getResolvedIncidentsReport(selectedOrg, days)
      .then(resp => setResolvedData(resp || null))
      .finally(() => setLoadingResolved(false))
  }, [activeTab, selectedOrg, days])

  // ── Cargar reporte de reincidencias cuando se activa esa pestaña ──────────
  useEffect(() => {
    if (activeTab !== 'recurrence' || !selectedOrg) return
    setLoadingRecurrence(true)
    const orgParam = selectedOrg === 'ALL' ? null : selectedOrg
    getRecurrenceReport(orgParam, days)
      .then(resp => setRecurrenceData(resp || null))
      .finally(() => setLoadingRecurrence(false))
  }, [activeTab, selectedOrg, days])

  // ── Guardar workStatus / claimNumber ──────────────────────────────────────
  const handleSaveIncident = useCallback(async (id, updates) => {
    const updated = await updateIncidentWorkStatus(id, updates)
    if (!updated) return false

    // Si se marcó como resolved, sacarlo de la lista de abiertos
    if (updates.workStatus === 'resolved') {
      setData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          recentOpen: prev.recentOpen.filter(i => i._id !== id),
          kpis: { ...prev.kpis, openIncidents: Math.max(0, prev.kpis.openIncidents - 1) }
        }
      })
    } else {
      setData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          recentOpen: prev.recentOpen.map(i =>
            i._id === id ? {
              ...i,
              workStatus:      updates.workStatus      ?? i.workStatus,
              claimNumber:     updates.claimNumber     ?? i.claimNumber,
              resolutionNotes: updates.resolutionNotes ?? i.resolutionNotes,
            } : i
          )
        }
      })
    }
    return true
  }, [])

  const handleToggleSLA = useCallback(async (id, countsSLA) => {
    const updated = await toggleIncidentSLA(id, countsSLA)
    if (!updated) return
    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        recentOpen: prev.recentOpen.map(i => i._id === id ? { ...i, countsSLA } : i),
      }
    })
  }, [])

  const handleNewIncident = useCallback((incident) => {
    if (!incident) return
    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        recentOpen: [incident, ...prev.recentOpen],
        kpis: { ...prev.kpis, openIncidents: prev.kpis.openIncidents + 1 },
      }
    })
  }, [])

  const handleBulkClaim = useCallback(async (ids, claimNumber, workStatus) => {
    const modified = await bulkAssignClaim(ids, claimNumber, workStatus)
    if (modified === null) return null

    setData(prev => {
      if (!prev) return prev
      const updatedOpen = prev.recentOpen.map(i =>
        ids.includes(i._id)
          ? { ...i, claimNumber, workStatus: workStatus ?? i.workStatus }
          : i
      ).filter(i => workStatus !== 'resolved' || !ids.includes(i._id))

      return {
        ...prev,
        recentOpen: updatedOpen,
        kpis: {
          ...prev.kpis,
          openIncidents: workStatus === 'resolved'
            ? Math.max(0, prev.kpis.openIncidents - ids.length)
            : prev.kpis.openIncidents,
        },
      }
    })
    return modified
  }, [])

  const handleToggleSLAResolved = useCallback(async (id, countsSLA) => {
    const ok = await toggleIncidentSLA(id, countsSLA)
    if (!ok) return
    setResolvedData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        incidents: prev.incidents.map(i =>
          String(i._id) === String(id) ? { ...i, countsSLA } : i
        ),
      }
    })
  }, [])

  const handleDeleteIncident = useCallback(async (id, inc) => {
    const label = inc?.deviceSerial || id
    if (!window.confirm(`¿Eliminar el registro "${label}" de la base de datos? Esta acción no se puede deshacer.`)) return
    const ok = await deleteIncident(id)
    if (!ok) return
    setResolvedData(prev => {
      if (!prev) return prev
      const filtered = prev.incidents.filter(i => String(i._id) !== String(id))
      return { ...prev, incidents: filtered, summary: { ...prev.summary, total: filtered.length } }
    })
  }, [])

  const orgName = orgs.find(o => o.id === selectedOrg)?.name || ''

  return (
    <div className="inc__dashboard">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="inc__header">
        <div className="inc__header-left">
          { /*<Text as="h2" className="inc__title">Incident Management</Text>*/}
          <Text as="p" className="inc__subtitle">
            Service Availability &amp; Incident reporting — infrastructure, network and managed device level
          </Text>
        </div>
        <div className="inc__controls">
          {/* Selector de organización */}
          {orgs.length > 0 && (
            <OrgSelector orgs={orgs} value={selectedOrg} onChange={setSelectedOrg} />
          )}
          {/* Selector de período */}
          <div className="inc__period-selector">
            <span className="inc__period-label">Period:</span>
            {PERIOD_OPTIONS.map(d => (
              <button
                key={d}
                className={`inc__period-btn${days === d ? ' inc__period-btn--active' : ''}`}
                onClick={() => setDays(d)}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Loading / Error ──────────────────────────────────────────────── */}
      {loading && (
        <div className="inc__loading">
          <span className="inc__spinner" />
          Loading incident data for <strong style={{ color: COLOR_ACCENT, marginLeft: '0.3rem' }}>{orgName}</strong>…
        </div>
      )}
      {error && <div className="inc__error">{error}</div>}

      {/* ── Dashboard ─────────────────────────────────────────────────────── */}
      {!loading && data && (
        <>
          {/* KPIs 
          <div className="inc__kpi-row">
            <KpiCard label="Total Incidents"  value={data.kpis.totalIncidents}    accent />
            <KpiCard label="Open"             value={data.kpis.openIncidents}      />
            <KpiCard label="Resolved"         value={data.kpis.resolvedIncidents}  />
            <KpiCard label="Avg MTTR"         value={data.kpis.avgMTTR}  unit=" min" sub="Mean Time To Restore" />
            <AvailabilityBadge value={data.kpis.availability} />
          </div>
            */}
          {/* Charts row 1: Timeline + By Type 
          <div className="inc__charts-row">
            <div className="inc__chart-panel inc__chart-panel--wide">
              <Text as="h3" className="inc__panel-title">Incident Timeline — last {days} days</Text>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.timeline} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: COLOR_MUTED, fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fill: COLOR_MUTED, fontSize: 10 }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem', color: COLOR_MUTED }} />
                  <Line type="monotone" dataKey="total"    stroke={COLOR_ACCENT}  strokeWidth={2}   dot={false} name="Total" />
                  <Line type="monotone" dataKey="resolved" stroke={COLOR_SUCCESS} strokeWidth={1.5} dot={false} name="Resolved" />
                  <Line type="monotone" dataKey="open"     stroke={COLOR_ERROR}   strokeWidth={1.5} dot={false} name="Open" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="inc__chart-panel">
              <Text as="h3" className="inc__panel-title">By Type</Text>
              {data.byType.length === 0
                ? <p className="inc__empty">No data</p>
                : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={data.byType} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={80}
                        label={({ name, percent }) => `${name.replace('_', ' ')} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ stroke: COLOR_MUTED }}
                      >
                        {data.byType.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )
              }
            </div>
          </div>
            */}
          {/* Charts row 2: By Severity + Top Networks 
          <div className="inc__charts-row">
            <div className="inc__chart-panel">
              <Text as="h3" className="inc__panel-title">By Severity</Text>
              {data.bySeverity.length === 0
                ? <p className="inc__empty">No data</p>
                : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.bySeverity} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: COLOR_MUTED, fontSize: 11 }} />
                      <YAxis tick={{ fill: COLOR_MUTED, fontSize: 11 }} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="value" name="Incidents" radius={[4, 4, 0, 0]}>
                        {data.bySeverity.map((entry, i) => (
                          <Cell key={i} fill={SEVERITY_COLORS[entry.name] || COLOR_MUTED} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )
              }
            </div>

            <div className="inc__chart-panel inc__chart-panel--wide">
              <Text as="h3" className="inc__panel-title">Top Affected Networks</Text>
              {data.topNetworks.length === 0
                ? <p className="inc__empty">No data</p>
                : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.topNetworks} layout="vertical"
                      margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" tick={{ fill: COLOR_MUTED, fontSize: 10 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="networkName" width={160}
                        tick={{ fill: COLOR_MUTED, fontSize: 10 }}
                        tickFormatter={v => v.length > 22 ? v.slice(0, 22) + '…' : v}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="count" name="Incidents" fill={COLOR_SECONDARY} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )
              }
            </div>
          </div>
*/}
          {/* ── Tabs: Open / Resolved ─────────────────────────────────────── */}
          <div className="inc__tabs">
            <button
              className={`inc__tab${activeTab === 'open' ? ' inc__tab--active' : ''}`}
              onClick={() => setActiveTab('open')}
            >
              Open Incidents
              <span className="inc__badge inc__badge--count" style={{ marginLeft: '0.5rem' }}>
                {data.recentOpen?.length ?? data.kpis.openIncidents}
              </span>
            </button>
            <button
              className={`inc__tab${activeTab === 'resolved' ? ' inc__tab--active' : ''}`}
              onClick={() => setActiveTab('resolved')}
            >
              Resolved Report
            </button>
            <button
              className={`inc__tab${activeTab === 'recurrence' ? ' inc__tab--active' : ''}`}
              onClick={() => setActiveTab('recurrence')}
            >
              Reincidencias
            </button>
          </div>

          {/* ── Panel Open ────────────────────────────────────────────────── */}
          {activeTab === 'open' && (
            <div className="inc__panel">
              <Text as="h3" className="inc__panel-title">
                Open Incidents — {orgName}
              </Text>
              <p className="inc__table-hint">
                Ordená por estado: <strong style={{color: COLOR_ERROR}}>Active</strong> primero, luego <strong style={{color: COLOR_WARNING}}>In Progress</strong>. Al marcar como <strong style={{color: COLOR_SUCCESS}}>Resolved</strong> el incidente se guarda con timestamp y pasa al reporte histórico.
              </p>
              <OpenIncidentsTable
                rows={[...data.recentOpen].sort((a, b) => {
                  if (a.workStatus === 'suspended' && b.workStatus !== 'suspended') return 1
                  if (b.workStatus === 'suspended' && a.workStatus !== 'suspended') return -1
                  const order = { DEVICE_OFFLINE: 0, UPLINK_DOWN: 1 }
                  return (order[a.incidentType] ?? 2) - (order[b.incidentType] ?? 2)
                })}
                onSave={handleSaveIncident}
                onBulkClaim={handleBulkClaim}
                onToggleSLA={handleToggleSLA}
                onNewIncident={handleNewIncident}
                orgs={orgs}
                showOrg={selectedOrg === 'ALL'}
              />
            </div>
          )}

          {/* ── Panel Resolved ────────────────────────────────────────────── */}
          {activeTab === 'resolved' && (
            loadingResolved
              ? <div className="inc__loading"><span className="inc__spinner" /> Loading resolved report…</div>
              : <ResolvedReportTable data={resolvedData} onDelete={handleDeleteIncident} onToggleSLA={handleToggleSLAResolved} />
          )}

          {/* ── Panel Reincidencias ───────────────────────────────────────── */}
          {activeTab === 'recurrence' && (
            loadingRecurrence
              ? <div className="inc__loading"><span className="inc__spinner" /> Cargando reincidencias…</div>
              : <RecurrenceTable data={recurrenceData} />
          )}

          {/* Footer */}
          <div className="inc__footer-note">
            Data from MongoDB · {orgName} · Period: last {days} days · Since {new Date(data.period.since).toLocaleDateString('en-GB')}
          </div>
        </>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useTheme } from '../../hooks/useTheme'
import { getIncidentNetworkDetail } from '../../utils/api'
import IncidentWanDetail from './IncidentWanDetail'
import {
  COLOR_ACCENT, COLOR_MUTED, COLOR_WARNING,
  SEVERITY_COLORS, WORK_STATUS_CFG,
  fmtDate, toDatetimeLocal,
} from './incidentConstants'

function deriveType(model) {
  if (!model) return null
  const m = model.toUpperCase()
  if (m.startsWith('MX')) return 'MX'
  if (m.startsWith('MS')) return 'MS'
  if (m.startsWith('MR') || m.startsWith('CW')) return 'MR'
  if (m.startsWith('MG')) return 'MG'
  return null
}

// Agrupa incidentes jerárquicamente usando uplinkSerial.
// Los hijos solo se anidan (y desaparecen del nivel raíz) cuando el padre está en 'in_progress'.
// Retorna array plano ordenado: root → sus hijos → sus nietos (depth=0,1,2)
function buildHierarchy(rows) {
  const bySerial = new Map(rows.map(r => [r.deviceSerial?.trim(), r._id]))
  const byId     = new Map(rows.map(r => [r._id, r]))

  const childrenOf = new Map()   // parentIncId → [child incs]
  const isChild    = new Set()   // incIds que son hijos de alguien (solo cuando padre in_progress)

  for (const inc of rows) {
    if (!inc.uplinkSerial) continue
    const parentId = bySerial.get(inc.uplinkSerial?.trim())
    if (!parentId) continue
    const parent = byId.get(parentId)
    // Solo anidar si el padre está siendo gestionado (in_progress)
    if (parent?.workStatus !== 'in_progress') continue
    if (!childrenOf.has(parentId)) childrenOf.set(parentId, [])
    childrenOf.get(parentId).push(inc)
    isChild.add(inc._id)
  }

  // CRITICAL MX cascade: otros incidentes de la misma red se agrupan bajo el MX crítico
  const criticalMxByNetwork = new Map() // networkId → MX inc._id
  for (const inc of rows) {
    if (isChild.has(inc._id)) continue
    const t = inc.deviceType || deriveType(inc.deviceModel)
    if (inc.severity === 'critical' && t === 'MX') {
      criticalMxByNetwork.set(inc.networkId, inc._id)
    }
  }

  const cascadeParentOf = new Map() // childIncId → parentMxIncId
  for (const inc of rows) {
    if (isChild.has(inc._id)) continue
    const parentMxId = criticalMxByNetwork.get(inc.networkId)
    if (!parentMxId || parentMxId === inc._id) continue
    cascadeParentOf.set(inc._id, parentMxId)
  }

  const flat = []
  const walk = (inc, depth) => {
    flat.push({ inc, depth, cascadeParentId: null })
    for (const child of (childrenOf.get(inc._id) || [])) walk(child, depth + 1)
  }
  for (const inc of rows) {
    if (!isChild.has(inc._id) && !cascadeParentOf.has(inc._id)) walk(inc, 0)
  }

  // Insertar cascade children inmediatamente después de su MX CRITICAL padre
  const result = []
  for (const item of flat) {
    result.push(item)
    if (criticalMxByNetwork.get(item.inc.networkId) === item.inc._id) {
      for (const inc of rows) {
        if (cascadeParentOf.get(inc._id) === item.inc._id) {
          result.push({ inc, depth: item.depth + 1, cascadeParentId: item.inc._id })
        }
      }
    }
  }

  return result
}

function OpenIncidentRow({ inc, onSave, onToggleSLA, onNewIncident, selected, onToggleSelect, orgName, depth, cascadeCount = 0, isCascadeExpanded = false, onToggleCascade, isReadonly = false, isAdmin = false, slaColumnActive = false }) {
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [ws, setWs] = useState(inc.workStatus || 'active')
  const [claim, setClaim] = useState(inc.claimNumber || '')
  const [notes, setNotes] = useState(inc.resolutionNotes || '')
  const [detectedAt, setDetectedAt] = useState(inc.detectedAt || null)
  const [editingDetected, setEditingDetected] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const handleWsChange = v => { setWs(v); setDirty(true) }
  const handleClaimChange = v => { setClaim(v); setDirty(true) }
  const handleNotesChange = v => { setNotes(v); setDirty(true) }
  const handleDetectedChange = v => { setDetectedAt(v ? new Date(v) : null); setDirty(true) }

  const toggleExpand = async () => {
    const next = !expanded
    setExpanded(next)
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
    const ok = await onSave(inc._id, { workStatus: ws, claimNumber: claim, resolutionNotes: notes, detectedAt })
    setSaving(false)
    if (ok !== false) { setDirty(false); setEditingDetected(false) }
  }

  const cfg = WORK_STATUS_CFG[ws] || WORK_STATUS_CFG.active
  const suspendedRecovered   = ws === 'suspended'    && (inc.recurrenceCount ?? 0) > 0
  const inProgressRecovered = ws === 'in_progress' && !!inc.lastAutoResolvedAt
  const isCascade = depth > 0
  const rowStyle =
    suspendedRecovered
      ? { background: 'rgba(16,185,129,0.07)', borderLeft: '3px solid #10b981' }
      : ws === 'suspended'
      ? { opacity: 0.45, filter: 'grayscale(0.6)', borderLeft: '3px solid #475569' }
      : inProgressRecovered
      ? { background: 'rgba(16,185,129,0.07)', borderLeft: '3px solid #10b981' }
      : ws === 'in_progress'
      ? { background: 'rgba(245,158,11,0.07)', borderLeft: `3px solid ${COLOR_WARNING}` }
      : isCascade
      ? { background: 'rgba(100,116,139,0.06)', borderLeft: '3px solid #334155' }
      : {}

  return (
    <>
      <tr onClick={toggleExpand} style={{ cursor: 'pointer', ...rowStyle }}>
        <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center', paddingRight: '0.25rem' }}>
          <input type="checkbox" checked={selected} disabled={isReadonly} onChange={() => onToggleSelect(inc._id)}
            style={{ cursor: 'pointer', accentColor: COLOR_ACCENT }} />
        </td>
        <td className="inc__td-mono" style={{ color: COLOR_MUTED, fontSize: '0.75rem', textAlign: 'center' }}>
          {expanded ? '▾' : '▸'}
        </td>
        <td>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span className="inc__badge" style={{
              background: (SEVERITY_COLORS[inc.severity] || COLOR_MUTED) + '22',
              color: SEVERITY_COLORS[inc.severity] || COLOR_MUTED,
              border: `1px solid ${SEVERITY_COLORS[inc.severity] || COLOR_MUTED}44`,
            }}>
              {inc.severity}
            </span>
            <span style={{ fontSize: '0.65rem', color: '#64748b', fontFamily: 'monospace' }}>
              {inc.incidentType === 'DEVICE_OFFLINE' ? 'offline' : inc.uplinkInterface || inc.incidentType}
            </span>
            {(inc.recurrenceCount ?? 0) > 0 && (
              <span
                title={`Recupero automatico ${inc.recurrenceCount}x`}
                style={{
                  fontSize: '0.62rem', fontWeight: 700, fontFamily: 'monospace',
                  color:      suspendedRecovered ? '#10b981' : '#f59e0b',
                  background: suspendedRecovered ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                  border:     `1px solid ${suspendedRecovered ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.3)'}`,
                  borderRadius: 3, padding: '0 0.3rem', cursor: 'default', alignSelf: 'flex-start',
                }}
              >
                {suspendedRecovered ? '⬆ levanto' : `↻ ${inc.recurrenceCount}`}
              </span>
            )}
       
          </div>
        </td>
        <td className="inc__td-mono">
          {inc.networkName || inc.networkId || '—'}
          {cascadeCount > 0 && (
            <span
              onClick={e => { e.stopPropagation(); onToggleCascade?.() }}
              title={isCascadeExpanded ? 'Ocultar dispositivos en cascada' : `${cascadeCount} dispositivo${cascadeCount > 1 ? 's' : ''} caído${cascadeCount > 1 ? 's' : ''} por red caída`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                marginLeft: '0.4rem',
                fontSize: '0.6rem', fontWeight: 600, fontFamily: 'monospace',
                color: isCascadeExpanded ? '#64748b' : '#f97316',
                background: isCascadeExpanded ? 'rgba(100,116,139,0.1)' : 'rgba(249,115,22,0.1)',
                border: `1px solid ${isCascadeExpanded ? 'rgba(100,116,139,0.3)' : 'rgba(249,115,22,0.3)'}`,
                borderRadius: 3, padding: '0.05rem 0.3rem', cursor: 'pointer', userSelect: 'none',
              }}
            >
              {isCascadeExpanded ? '▴' : '▾'} {isCascadeExpanded ? 'ocultar' : `+${cascadeCount}`}
            </span>
          )}
          {orgName && (
            <span style={{ display: 'block', fontSize: '0.65rem', color: COLOR_MUTED, marginTop: '0.1rem' }}>{orgName}</span>
          )}
          {inc.tags?.length > 0 && (
            <span style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
              {inc.tags.map(tag => (
                <span key={tag} style={{
                  fontSize: '0.6rem', fontWeight: 600, fontFamily: 'monospace',
                  color: '#f59e0b', background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: 3, padding: '0.05rem 0.25rem',
                }}>{tag}</span>
              ))}
            </span>
          )}
        </td>
        <td style={{ textAlign: 'center' }}>
          {(() => {
            const t = inc.deviceType || deriveType(inc.deviceModel)
            const COLORS = { MX: '#00d4ff', MS: '#10b981', MR: '#a78bfa', MG: '#f59e0b' }
            const BKGS   = { MX: 'rgba(0,212,255,0.08)', MS: 'rgba(16,185,129,0.08)', MR: 'rgba(167,139,250,0.08)', MG: 'rgba(245,158,11,0.08)' }
            const BORDS  = { MX: 'rgba(0,212,255,0.25)', MS: 'rgba(16,185,129,0.25)', MR: 'rgba(167,139,250,0.25)', MG: 'rgba(245,158,11,0.25)' }
            return t
              ? <span style={{
                  fontSize: '0.65rem', fontWeight: 700, fontFamily: 'monospace',
                  color: COLORS[t] || '#64748b', background: BKGS[t] || 'transparent',
                  border: `1px solid ${BORDS[t] || 'transparent'}`,
                  borderRadius: 3, padding: '0.05rem 0.3rem',
                }}>{t}</span>
              : <span style={{ color: '#475569' }}>—</span>
          })()}
        </td>
        <td className="inc__td-mono">
          {isCascade && (
            <span style={{ color: '#475569', marginRight: '0.3rem', userSelect: 'none' }}>
              {'└'.padStart(depth * 2, ' ')}
            </span>
          )}
          {inc.deviceSerial || '—'}
          {isCascade && (
            <span title="Impactado por upstream" style={{ marginLeft: '0.3rem', fontSize: '0.65rem', color: '#64748b' }}>↳</span>
          )}
        </td>
        <td>
          {inc.uplinkInterface
            ? <span className="inc__badge" style={{
                background: 'rgba(0,212,255,0.08)', color: '#00d4ff',
                border: '1px solid rgba(0,212,255,0.3)', fontFamily: 'monospace', fontSize: '0.72rem',
              }}>{inc.uplinkInterface}</span>
            : <span style={{ color: '#64748b' }}>—</span>
          }
        </td>
        <td className="inc__td-mono" onClick={e => e.stopPropagation()}>
          {editingDetected
            ? <input type="datetime-local" defaultValue={toDatetimeLocal(detectedAt)}
                onChange={e => handleDetectedChange(e.target.value)}
                style={{ fontSize: '0.7rem', padding: '0.15rem 0.3rem', background: '#1e293b',
                  color: '#e2e8f0', border: '1px solid #3b82f6', borderRadius: 4, outline: 'none', width: '11rem' }} />
            : <span title="Click para editar la fecha de deteccion" onClick={() => !isReadonly && setEditingDetected(true)}
                style={{ cursor: 'pointer', borderBottom: '1px dashed #475569' }}>
                {detectedAt ? fmtDate(detectedAt) : <span style={{ color: COLOR_WARNING, fontStyle: 'italic' }}>sin fecha</span>}
              </span>
          }
        </td>
        <td className="inc__td-mono" onClick={e => e.stopPropagation()}>
          <select className="inc__ws-select" value={ws} disabled={isReadonly} onChange={e => handleWsChange(e.target.value)}
            style={{ color: cfg.color, borderColor: cfg.color + '88', background: cfg.bg }}>
            <option value="active">Active</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="suspended">Suspended</option>
          </select>
        </td>
        <td className="inc__td-mono" onClick={e => e.stopPropagation()}>
          <input className="inc__claim-input" type="text" placeholder="Nro reclamo"
            value={claim} disabled={isReadonly} onChange={e => handleClaimChange(e.target.value)} />
        </td>
        <td className="inc__td-mono" onClick={e => e.stopPropagation()}>
          <input className="inc__claim-input" type="text" placeholder="Motivo / notas"
            value={notes} disabled={isReadonly} onChange={e => handleNotesChange(e.target.value)} style={{ minWidth: 90, maxWidth: 160 }} />
        </td>
        <td className="inc__td-mono" onClick={e => e.stopPropagation()}>
          <span
            title={inc.countsSLA ? 'Cuenta para SLA' : 'No cuenta para SLA'}
            onClick={() => slaColumnActive && !isReadonly && onToggleSLA(inc._id, !inc.countsSLA)}
            style={{
              fontSize: '0.65rem', fontWeight: 700, fontFamily: 'monospace',
              color:      inc.countsSLA ? '#10b981' : '#64748b',
              background: inc.countsSLA ? 'rgba(16,185,129,0.08)' : 'rgba(100,116,139,0.06)',
              border:     `1px solid ${inc.countsSLA ? 'rgba(16,185,129,0.25)' : 'rgba(100,116,139,0.2)'}`,
              borderRadius: 3, padding: '0.05rem 0.35rem',
              cursor: slaColumnActive && !isReadonly ? 'pointer' : 'default',
              userSelect: 'none',
            }}
          >SLA</span>
        </td>
        <td className="inc__td-mono" onClick={e => e.stopPropagation()}>
          <button className="btn btn__secondary btn__outline" style={{ padding: '0.25rem 0.6rem' }}
            onClick={handleSave} disabled={!dirty || isReadonly} title="Guardar">
            {saving ? '…' : '✔'}
          </button>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td />
          <td colSpan={10} style={{ padding: '0.75rem 0.5rem 0.75rem 0' }}>
            <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 6, padding: '0.75rem 1rem', animation: 'inc-expand 0.18s ease' }}>
              {loadingDetail
                ? <div className="inc__loading">Cargando WAN…</div>
                : <IncidentWanDetail detail={detail} inc={inc} onManualIncidentCreated={onNewIncident} />
              }
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export function OpenIncidentsTable({ rows, onSave, onBulkClaim, onToggleSLA, onNewIncident, orgs, showOrg, isReadonly = false, isAdmin = false }) {
  const { theme } = useTheme()
  const [selected, setSelected] = useState([])
  const [slaColumnActive, setSlaColumnActive] = useState(false)
  const [bulkClaim, setBulkClaim] = useState('')
  const [bulkStatus, setBulkStatus] = useState('in_progress')
  const [bulkNotes, setBulkNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState(null)
  const [filterWan, setFilterWan] = useState(null)
  const [expandedCritical, setExpandedCritical] = useState(new Set())

  const toggleCriticalCascade = id =>
    setExpandedCritical(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleSelect = id =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2 }
  const STATUS_ORDER   = { active: 0, in_progress: 1 }

  const sortRows = arr => [...arr].sort((a, b) => {
    const aSusp = a.workStatus === 'suspended' ? 1 : 0
    const bSusp = b.workStatus === 'suspended' ? 1 : 0
    if (aSusp !== bSusp) return aSusp - bSusp
    const sevDiff = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
    if (sevDiff !== 0) return sevDiff
    return (STATUS_ORDER[a.workStatus] ?? 9) - (STATUS_ORDER[b.workStatus] ?? 9)
  })

  const filteredRows = sortRows(
    (filterStatus === 'all' ? rows : rows.filter(r => r.workStatus === filterStatus))
      .filter(r => !filterType || (r.deviceType || deriveType(r.deviceModel)) === filterType)
      .filter(r => !filterWan || r.uplinkInterface === filterWan)
  )
  const hierarchy = buildHierarchy(filteredRows)

  const cascadeCountByParent = {}
  for (const { cascadeParentId } of hierarchy) {
    if (cascadeParentId) {
      cascadeCountByParent[cascadeParentId] = (cascadeCountByParent[cascadeParentId] || 0) + 1
    }
  }

  const visibleHierarchy = hierarchy.filter(({ cascadeParentId }) =>
    !cascadeParentId || expandedCritical.has(cascadeParentId)
  )

  const toggleAll = () =>
    setSelected(prev => prev.length === filteredRows.length ? [] : filteredRows.map(r => r._id))

  const handleBulkSave = async () => {
    if (!bulkClaim.trim() || selected.length === 0) return
    setSaving(true)
    const modified = await onBulkClaim(selected, bulkClaim.trim(), bulkStatus, bulkNotes.trim())
    if (modified !== null) { setSelected([]); setBulkClaim(''); setBulkNotes('') }
    setSaving(false)
  }

  if (!rows || rows.length === 0)
    return <p className="inc__empty">No open incidents for this organization</p>

  const STATUS_FILTERS = [
    { key: 'all',         label: 'All' },
    { key: 'active',      label: 'Active' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'suspended',   label: 'Suspended' },
  ]

  return (
    <>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {STATUS_FILTERS.map(f => {
          const active = filterStatus === f.key
          const cfg = WORK_STATUS_CFG[f.key]
          return (
            <button key={f.key}
              onClick={() => { setFilterStatus(f.key); setSelected([]) }}
              style={{
                padding: '0.2rem 0.75rem', borderRadius: 20,
                border: `1px solid ${active ? (cfg?.color ?? COLOR_ACCENT) : (theme === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)')}`,
                background: active ? (cfg?.bg ?? 'rgba(0,212,255,0.12)') : 'transparent',
                color: active ? (cfg?.color ?? COLOR_ACCENT) : COLOR_MUTED,
                cursor: 'pointer', fontSize: '0.78rem', fontWeight: active ? 600 : 400, transition: 'all 0.15s',
              }}
            >
              {f.label}
              {f.key !== 'all' && (
                <span style={{ marginLeft: '0.35rem', opacity: 0.7 }}>
                  ({rows.filter(r => r.workStatus === f.key).length})
                </span>
              )}
            </button>
          )
        })}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { type: 'MX', color: '#00d4ff', bg: 'rgba(0,212,255,0.08)', bgActive: 'rgba(0,212,255,0.18)', border: 'rgba(0,212,255,0.25)', borderActive: '#00d4ff' },
            { type: 'MS', color: '#10b981', bg: 'rgba(16,185,129,0.08)', bgActive: 'rgba(16,185,129,0.18)', border: 'rgba(16,185,129,0.25)', borderActive: '#10b981' },
            { type: 'MR', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', bgActive: 'rgba(167,139,250,0.18)', border: 'rgba(167,139,250,0.25)', borderActive: '#a78bfa' },
            { type: 'MG', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', bgActive: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.25)', borderActive: '#f59e0b' },
          ].map(({ type, color, bg, bgActive, border, borderActive }) => {
            const count = rows.filter(r => (r.deviceType || deriveType(r.deviceModel)) === type).length
            if (!count) return null
            const active = filterType === type
            return (
              <span
                key={type}
                onClick={() => { setFilterType(active ? null : type); setSelected([]) }}
                title={active ? `Quitar filtro ${type}` : `Filtrar por ${type}`}
                style={{
                  fontSize: '0.68rem', fontWeight: 700, fontFamily: 'monospace',
                  color, background: active ? bgActive : bg,
                  border: `1px solid ${active ? borderActive : border}`,
                  borderRadius: 4, padding: '0.15rem 0.45rem',
                  display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                  cursor: 'pointer', userSelect: 'none',
                  boxShadow: active ? `0 0 0 1px ${borderActive}44` : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {type} <span style={{ opacity: active ? 1 : 0.75, fontWeight: active ? 700 : 400 }}>{count}</span>
              </span>
            )
          })}
        </div>
        {(() => {
          const WAN_CFG = {
            wan1: { color: '#38bdf8', bg: 'rgba(56,189,248,0.08)', bgActive: 'rgba(56,189,248,0.18)', border: 'rgba(56,189,248,0.25)', borderActive: '#38bdf8' },
            wan2: { color: '#fb923c', bg: 'rgba(251,146,60,0.08)', bgActive: 'rgba(251,146,60,0.18)', border: 'rgba(251,146,60,0.25)', borderActive: '#fb923c' },
          }
          const WAN_FALLBACK = { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', bgActive: 'rgba(148,163,184,0.18)', border: 'rgba(148,163,184,0.25)', borderActive: '#94a3b8' }
          const wanTypes = [...new Set(rows.map(r => r.uplinkInterface).filter(Boolean))].sort()
          if (!wanTypes.length) return null
          return (
            <>
              <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', margin: '0 0.15rem', flexShrink: 0 }} />
              {wanTypes.map(wan => {
                const count = rows.filter(r => r.uplinkInterface === wan).length
                const cfg = WAN_CFG[wan] || WAN_FALLBACK
                const active = filterWan === wan
                return (
                  <span
                    key={wan}
                    onClick={() => { setFilterWan(active ? null : wan); setSelected([]) }}
                    title={active ? `Quitar filtro ${wan.toUpperCase()}` : `Filtrar por ${wan.toUpperCase()}`}
                    style={{
                      fontSize: '0.68rem', fontWeight: 700, fontFamily: 'monospace',
                      color: cfg.color, background: active ? cfg.bgActive : cfg.bg,
                      border: `1px solid ${active ? cfg.borderActive : cfg.border}`,
                      borderRadius: 4, padding: '0.15rem 0.45rem',
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      cursor: 'pointer', userSelect: 'none',
                      boxShadow: active ? `0 0 0 1px ${cfg.borderActive}44` : 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    {wan.toUpperCase()} <span style={{ opacity: active ? 1 : 0.75, fontWeight: active ? 700 : 400 }}>{count}</span>
                  </span>
                )
              })}
            </>
          )
        })()}
      </div>

      {(() => {
        const recoveredWans = rows.filter(r =>
          (r.uplinkInterface === 'wan1' || r.uplinkInterface === 'wan2') &&
          r.workStatus === 'in_progress' &&
          !!r.lastAutoResolvedAt
        )
        if (!recoveredWans.length) return null
        const WAN_COLOR = { wan1: '#38bdf8', wan2: '#fb923c' }
        return (
          <div style={{
            marginBottom: '0.6rem',
            background: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 6,
            padding: '0.45rem 0.75rem',
            display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center',
          }}>
            <span style={{
              color: '#10b981', fontWeight: 700, fontSize: '0.72rem',
              fontFamily: 'monospace', whiteSpace: 'nowrap', marginRight: '0.2rem',
            }}>
              ⬆ WAN levantó
            </span>
            {recoveredWans.map(r => (
              <span key={r._id} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 4, padding: '0.15rem 0.5rem',
                fontSize: '0.7rem', fontFamily: 'monospace',
              }}>
                <span style={{ color: WAN_COLOR[r.uplinkInterface] ?? '#94a3b8', fontWeight: 700 }}>
                  {r.uplinkInterface.toUpperCase()}
                </span>
                <span style={{ color: '#cbd5e1' }}>{r.networkName || r.networkId}</span>
                <span style={{ color: '#10b981', fontSize: '0.63rem' }}>
                  ↑ {fmtDate(r.lastAutoResolvedAt)}
                </span>
              </span>
            ))}
          </div>
        )
      })()}
      {!isReadonly && selected.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
          background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.25)',
          borderRadius: 6, padding: '0.6rem 1rem', marginBottom: '0.75rem',
        }}>
          <span style={{ color: COLOR_ACCENT, fontWeight: 600, fontSize: '0.82rem' }}>
            {selected.length} incidente{selected.length > 1 ? 's' : ''} seleccionado{selected.length > 1 ? 's' : ''}
          </span>
          <input className="inc__claim-input" type="text" placeholder="Nro reclamo comun"
            value={bulkClaim} onChange={e => setBulkClaim(e.target.value)} style={{ minWidth: 140 }} />
          <input className="inc__claim-input" type="text" placeholder="Nota (opcional)"
            value={bulkNotes} onChange={e => setBulkNotes(e.target.value)} style={{ minWidth: 200 }} />
          <select className="inc__ws-select" value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
            style={{ color: WORK_STATUS_CFG[bulkStatus]?.color, borderColor: WORK_STATUS_CFG[bulkStatus]?.color + '88', background: WORK_STATUS_CFG[bulkStatus]?.bg }}>
            <option value="active">Active</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="suspended">Suspended</option>
          </select>
          <button className="btn btn__secondary btn__outline" onClick={handleBulkSave}
            disabled={!bulkClaim.trim() || saving} style={{ padding: '0.25rem 0.75rem' }}>
            {saving ? '…' : 'Asignar a seleccionados'}
          </button>
          <button style={{ background: 'none', border: 'none', color: COLOR_MUTED, cursor: 'pointer', fontSize: '0.8rem' }}
            onClick={() => setSelected([])}>
            Cancelar
          </button>
        </div>
      )}

      <div className="inc__table-wrap">
        <table className="inc__table">
          <thead>
            <tr>
              <th style={{ width: 32 }}>
                <input type="checkbox"
                  checked={selected.length === filteredRows.length && filteredRows.length > 0}
                  onChange={toggleAll} disabled={isReadonly} style={{ cursor: 'pointer', accentColor: COLOR_ACCENT }} />
              </th>
              <th>S</th>
              <th>Severity</th>
              <th>Network</th>
              <th>Type</th>
              <th>Device</th>
              <th>WAN</th>
              <th>Detected</th>
              <th>Status</th>
              <th>Claim #</th>
              <th>Notes</th>
              <th onClick={() => !isReadonly && setSlaColumnActive(v => !v)} style={{ cursor: slaColumnActive && !isReadonly ? 'pointer' : 'default', userSelect: 'none', color: slaColumnActive ? '#10b981' : 'inherit', borderBottom: slaColumnActive ? '2px solid #10b981' : '' }} title={slaColumnActive ? 'Click para desactivar columna SLA' : 'Click para activar columna SLA'}>SLA</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0
              ? <tr><td colSpan={12} style={{ textAlign: 'center', color: COLOR_MUTED, padding: '1.5rem 0', fontSize: '0.85rem' }}>
                  Sin incidentes con estado "{STATUS_FILTERS.find(f => f.key === filterStatus)?.label}"
                </td></tr>
              : visibleHierarchy.map(({ inc: r, depth }) => (
                <OpenIncidentRow
                  key={r._id}
                  inc={r}
                  depth={depth}
                  onSave={onSave}
                  onToggleSLA={onToggleSLA}
                  isAdmin={isAdmin}
                  slaColumnActive={slaColumnActive}
                  onNewIncident={onNewIncident}
                  selected={selected.includes(r._id)}
                  onToggleSelect={toggleSelect}
                  orgName={showOrg ? (orgs?.find(o => o.id === r.orgId)?.name ?? '') : ''}
                  cascadeCount={cascadeCountByParent[r._id] || 0}
                  isCascadeExpanded={expandedCritical.has(r._id)}
                  onToggleCascade={() => toggleCriticalCascade(r._id)}
                  isReadonly={isReadonly}
                />
              ))
            }
          </tbody>
        </table>
      </div>
    </>
  )
}

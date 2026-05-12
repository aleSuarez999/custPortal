import { useState } from 'react'
import { updateIncidentWorkStatus } from '../../utils/api'
import { KpiCard } from './KpiCard'
import {
  COLOR_ACCENT, COLOR_MUTED, COLOR_WARNING, COLOR_ERROR, COLOR_SUCCESS,
  fmtDate, toDatetimeLocal, formatDuration,
} from './incidentConstants'
import Text from '../Text'

function ResolvedRow({ r, onDelete, onToggleSLA, onSave, onReopen }) {
  const [notes, setNotes]           = useState(r.resolutionNotes || '')
  const [detectedAt, setDetectedAt] = useState(r.detectedAt || null)
  const [resolvedAt, setResolvedAt] = useState(r.resolvedAt || null)
  const [editingDetected, setEditingDetected] = useState(false)
  const [editingResolved, setEditingResolved] = useState(false)
  const [dirty, setDirty]   = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const ok = await onSave(r._id, { resolutionNotes: notes, detectedAt, resolvedAt })
    if (ok !== false) { setDirty(false); setEditingDetected(false); setEditingResolved(false) }
    setSaving(false)
  }

  return (
    <tr style={r.isDuplicateInGroup ? { opacity: 0.6 } : {}}>
      <td><span className="inc__badge inc__badge--type">{r.incidentType}</span></td>
      <td className="inc__td-mono">{r.networkName || r.networkId || '—'}</td>
      <td className="inc__td-mono">{r.deviceSerial || '—'}</td>
      <td className="inc__td-mono">
        {editingDetected
          ? <input type="datetime-local" defaultValue={toDatetimeLocal(detectedAt)}
              onChange={e => { setDetectedAt(e.target.value ? new Date(e.target.value) : null); setDirty(true) }}
              style={{ fontSize: '0.7rem', padding: '0.15rem 0.3rem', background: '#1e293b',
                color: '#e2e8f0', border: '1px solid #3b82f6', borderRadius: 4, outline: 'none', width: '11rem' }} />
          : <span title="Click para editar Link Down" onClick={() => setEditingDetected(true)}
              style={{ cursor: 'pointer', borderBottom: '1px dashed #475569' }}>
              {detectedAt ? fmtDate(detectedAt) : <span style={{ color: COLOR_WARNING, fontStyle: 'italic' }}>sin fecha</span>}
            </span>
        }
      </td>
      <td className="inc__td-mono">
        {editingResolved
          ? <input type="datetime-local" defaultValue={toDatetimeLocal(resolvedAt || r.effectiveResolvedAt)}
              onChange={e => { setResolvedAt(e.target.value ? new Date(e.target.value) : null); setDirty(true) }}
              style={{ fontSize: '0.7rem', padding: '0.15rem 0.3rem', background: '#1e293b',
                color: '#e2e8f0', border: '1px solid #3b82f6', borderRadius: 4, outline: 'none', width: '11rem' }} />
          : <span title="Click para editar Link Up" onClick={() => setEditingResolved(true)}
              style={{ cursor: 'pointer', borderBottom: '1px dashed #475569' }}>
              {(resolvedAt || r.effectiveResolvedAt) ? fmtDate(resolvedAt || r.effectiveResolvedAt) : '—'}
            </span>
        }
      </td>
      <td>
        {r.isDuplicateInGroup
          ? <span style={{ fontSize: '0.68rem', color: '#64748b', fontStyle: 'italic' }}
              title="Mismo equipo y claim — downtime ya contabilizado en el vinculo principal">
              ↳ mismo equipo
            </span>
          : r.downtimeHuman
            ? r.countsSLA
              ? <span className="inc__badge" style={{
                  background: r.downtimeMinutes > 60 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                  color:      r.downtimeMinutes > 60 ? COLOR_ERROR : COLOR_WARNING,
                  border:     `1px solid ${r.downtimeMinutes > 60 ? COLOR_ERROR : COLOR_WARNING}44`,
                }}>
                  {r.downtimeHuman}
                </span>
              : <span style={{ color: COLOR_MUTED, fontSize: '0.72rem' }} title="No cuenta SLA — informativo">{r.downtimeHuman}</span>
            : <span style={{ color: '#475569', fontSize: '0.68rem' }}>—</span>
        }
      </td>
      <td style={{ textAlign: 'center' }}>
        <button
          title={r.countsSLA ? 'Cuenta SLA — click para desactivar' : 'No cuenta SLA — click para activar'}
          onClick={() => onToggleSLA?.(r._id, !r.countsSLA)}
          style={{
            fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 4,
            cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
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
            <span title={`${r.downtimeHuman} — ${unavailPct}% indisponibilidad`}
              style={{ fontSize: '0.72rem', fontWeight: 700, color: ok ? '#10b981' : '#ef4444' }}>
              {ok ? '✔' : `${unavailPct}%`}
            </span>
          )
        })()}
      </td>
      <td className="inc__td-mono">{r.claimNumber || '—'}</td>
      <td style={{ minWidth: 180 }}>
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          <input value={notes} onChange={e => { setNotes(e.target.value); setDirty(true) }}
            placeholder="Notas…"
            style={{ flex: 1, fontSize: '0.72rem', padding: '0.2rem 0.4rem', background: '#1e293b',
              color: '#e2e8f0', border: `1px solid ${dirty ? '#3b82f6' : '#334155'}`,
              borderRadius: 4, outline: 'none', minWidth: 0 }} />
          {dirty && (
            <button onClick={handleSave} disabled={saving} title="Guardar nota"
              style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 4,
                cursor: saving ? 'default' : 'pointer', border: '1px solid #3b82f644',
                background: saving ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.18)',
                color: '#60a5fa', whiteSpace: 'nowrap' }}>
              {saving ? '…' : 'Guardar'}
            </button>
          )}
        </div>
      </td>
      <td style={{ textAlign: 'center', padding: '0 0.4rem' }}>
        <button title="Reabrir — pasar a In Progress" onClick={() => onReopen?.(r._id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569',
            padding: '0.2rem 0.35rem', lineHeight: 1, fontSize: '0.85rem', transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#f59e0b'}
          onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
          ↩
        </button>
        <button title="Eliminar registro" onClick={() => onDelete?.(r._id, r)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569',
            padding: '0.2rem', lineHeight: 1, fontSize: '0.9rem', transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
          onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
          🗑
        </button>
      </td>
    </tr>
  )
}

export function ResolvedReportTable({ data, onDelete, onToggleSLA, onSave, onReopen }) {
  const [filterManual, setFilterManual] = useState(false)
  if (!data) return null
  const { incidents } = data

  const manualIncidents  = incidents.filter(r => !!r.manualResolvedAt)
  const displayed        = filterManual ? manualIncidents : incidents
  const primaryIncidents = manualIncidents.filter(r => !r.isDuplicateInGroup)
  const slaIncidents     = primaryIncidents.filter(r => r.countsSLA)
  const totalDT          = slaIncidents.reduce((acc, r) => acc + (r.downtimeMinutes || 0), 0)
  const avgDT            = slaIncidents.length > 0 ? Math.round(totalDT / slaIncidents.length) : 0
  const maxDT            = slaIncidents.length > 0 ? Math.max(...slaIncidents.map(r => r.downtimeMinutes || 0)) : 0

  return (
    <div className="inc__panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <Text as="h3" className="inc__panel-title" style={{ margin: 0 }}>
          Resolved Incidents Report
          <span className="inc__badge inc__badge--count">{displayed.length}</span>
        </Text>
        <button
          onClick={() => setFilterManual(v => !v)}
          style={{
            fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: 4,
            cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
            background:   filterManual ? 'rgba(59,130,246,0.18)' : 'rgba(100,116,139,0.1)',
            color:        filterManual ? '#60a5fa' : '#94a3b8',
            borderColor:  filterManual ? '#3b82f644' : '#47556933',
          }}
        >
          {filterManual ? 'Cierre manual' : 'Todos'}
        </button>
      </div>

      <div className="inc__kpi-row" style={{ marginBottom: '1rem' }}>
        <KpiCard label="Total Resolved"   value={primaryIncidents.length}    accent />
        <KpiCard label="SLA Downtime"     value={formatDuration(totalDT)}    sub="solo incidentes SLA" />
        <KpiCard label="Avg SLA Downtime" value={formatDuration(avgDT)}      sub="por evento SLA" />
        <KpiCard label="Max SLA Downtime" value={formatDuration(maxDT)}      sub="evento unico" />
      </div>

      {displayed.length === 0
        ? <p className="inc__empty">{filterManual ? 'No hay incidentes cerrados manualmente en este periodo' : 'No hay incidentes resueltos en este periodo'}</p>
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
                  <th title="Acumula tiempo de SLA?">SLA</th>
                  <th title="MTTR contractual: 8hs">MTTR</th>
                  <th>Claim #</th>
                  <th>Notas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((r, i) => (
                  <ResolvedRow key={r._id || i} r={r}
                    onDelete={onDelete} onToggleSLA={onToggleSLA} onSave={onSave} onReopen={onReopen} />
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  )
}

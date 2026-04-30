import { useState, useEffect } from 'react'
import { getSlaReport } from '../../utils/api'
import { KpiCard } from './KpiCard'
import { formatDuration, fmtDate } from './incidentConstants'
import Text from '../Text'

const SLA_TARGET    = 99.70
const SLA_MAX_COLOR = '#10b981'
const SLA_ERR_COLOR = '#ef4444'

const TD = { padding: '0.2rem 0.5rem', fontFamily: 'monospace', fontSize: '0.78rem' }

export function SlaReportTable({ selectedOrg }) {
  const defaultMonth = () => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
  }

  const [month, setMonth]       = useState(defaultMonth)
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    if (!selectedOrg) return
    setLoading(true)
    const orgParam = selectedOrg === 'ALL' ? null : selectedOrg
    getSlaReport(month, orgParam)
      .then(resp => setData(resp || null))
      .finally(() => setLoading(false))
  }, [month, selectedOrg])

  const toggleSite = id => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="inc__panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <Text as="h3" className="inc__panel-title" style={{ margin: 0 }}>
          SLA Mensual — Reporte por Sitio
        </Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Mes:</span>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 4, color: '#e2e8f0', cursor: 'pointer' }} />
        </div>
      </div>

      {loading && (
        <div className="inc__loading"><span className="inc__spinner" /> Calculando SLA…</div>
      )}

      {!loading && data && (
        <>
          <div className="inc__kpi-row" style={{ marginBottom: '1rem' }}>
            <KpiCard label="Sitios evaluados"   value={data.summary.totalSites} accent />
            <KpiCard label="Cumplen SLA"
              value={data.summary.compliantSites}
              unit={` / ${data.summary.totalSites}`}
              sub={`Target: ${SLA_TARGET}%`}
            />
            <KpiCard label="Incumplen SLA"
              value={data.summary.nonCompliantSites}
              sub="requieren accion"
            />
            <KpiCard label="Downtime total SLA"
              value={formatDuration(data.summary.totalDowntimeMinutes)}
              sub={`Max permitido: ${data.period.maxAllowedHuman}/sitio`}
            />
          </div>

          <p style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.75rem' }}>
            Periodo: {new Date(data.period.start).toLocaleDateString('es-AR')} &rarr; {new Date(data.period.end).toLocaleDateString('es-AR')}
            {' · '}{data.period.totalMinutes.toLocaleString()} min totales
            {' · '}Max downtime permitido por sitio: <strong style={{ color: SLA_ERR_COLOR }}>{data.period.maxAllowedHuman}</strong>
            {' · '}Target: <strong style={{ color: SLA_MAX_COLOR }}>{SLA_TARGET}%</strong>
          </p>

          {data.sites.length === 0
            ? <p className="inc__empty">No hay incidentes SLA resueltos en este periodo.</p>
            : (
              <div className="inc__table-wrap">
                <table className="inc__table">
                  <thead>
                    <tr>
                      <th style={{ width: 24 }}></th>
                      <th>Sitio</th>
                      <th>Org</th>
                      <th style={{ textAlign: 'center' }}>Incidentes</th>
                      <th>Downtime</th>
                      <th>Disponibilidad</th>
                      <th style={{ textAlign: 'center' }}>Estado</th>
                      <th>MTTR prom.</th>
                      <th>MTTR max.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sites.map(site => {
                      const isOpen   = expanded[site.networkId]
                      const color    = site.compliant ? SLA_MAX_COLOR : SLA_ERR_COLOR
                      const overMin  = Math.max(0, site.downtimeMinutes - data.period.maxAllowedMinutes)
                      return (
                        <>
                          <tr key={site.networkId}
                            onClick={() => toggleSite(site.networkId)}
                            style={{
                              cursor: 'pointer',
                              borderLeft: `3px solid ${color}`,
                              background: site.compliant ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.05)',
                            }}
                          >
                            <td style={{ ...TD, textAlign: 'center', color: '#64748b' }}>{isOpen ? '▾' : '▸'}</td>
                            <td style={TD}>{site.networkName}</td>
                            <td style={{ ...TD, color: '#64748b', fontSize: '0.72rem' }}>{site.orgName}</td>
                            <td style={{ ...TD, textAlign: 'center' }}>
                              <span className="inc__badge" style={{
                                background: site.incidentCount > 1 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.12)',
                                color: site.incidentCount > 1 ? SLA_ERR_COLOR : '#f59e0b',
                                border: `1px solid ${site.incidentCount > 1 ? SLA_ERR_COLOR : '#f59e0b'}44`,
                                fontWeight: 700,
                              }}>
                                {site.incidentCount}
                              </span>
                            </td>
                            <td style={{ ...TD, color: site.compliant ? '#94a3b8' : SLA_ERR_COLOR, fontWeight: site.compliant ? 400 : 700 }}>
                              {site.downtimeHuman}
                              {!site.compliant && overMin > 0 && (
                                <span style={{ fontSize: '0.65rem', color: SLA_ERR_COLOR, marginLeft: '0.3rem' }}>
                                  (+{formatDuration(overMin)} sobre limite)
                                </span>
                              )}
                            </td>
                            <td style={{ ...TD, fontWeight: 700, color }}>{site.availabilityPct.toFixed(4)}%</td>
                            <td style={{ textAlign: 'center', padding: '0.2rem 0.5rem' }}>
                              <span style={{
                                fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 4,
                                background: site.compliant ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                color, border: `1px solid ${color}44`,
                              }}>
                                {site.compliant ? '✔ Cumple' : '✖ Incumple'}
                              </span>
                            </td>
                            <td style={TD}>{site.mttrAvgHuman}</td>
                            <td style={{ ...TD, color: site.mttrMaxMinutes > 480 ? SLA_ERR_COLOR : '#94a3b8' }}>
                              {site.mttrMaxHuman}
                              {site.mttrMaxMinutes > 480 && <span style={{ fontSize: '0.65rem', marginLeft: '0.25rem' }}>⚠</span>}
                            </td>
                          </tr>

                          {isOpen && (
                            <tr key={`${site.networkId}-detail`}>
                              <td />
                              <td colSpan={8} style={{ padding: '0.5rem 0.5rem 0.75rem 1rem' }}>
                                <table style={{ width: '100%', fontSize: '0.74rem', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr style={{ color: '#64748b' }}>
                                      <th style={TD}>Claim #</th>
                                      <th style={TD}>WAN</th>
                                      <th style={TD}>Link Down</th>
                                      <th style={TD}>Link Up</th>
                                      <th style={TD}>Duracion</th>
                                      <th style={TD}>Notas</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {site.incidents.map((inc, j) => (
                                      <tr key={inc._id || j} style={{
                                        borderLeft: '2px solid rgba(255,255,255,0.06)',
                                        background: j % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                                      }}>
                                        <td style={{ ...TD, fontWeight: 700, color: '#00d4ff' }}>{inc.claimNumber || '—'}</td>
                                        <td style={TD}>
                                          {inc.uplinkInterface
                                            ? <span style={{ color: '#00d4ff' }}>{inc.uplinkInterface}</span>
                                            : <span style={{ color: '#64748b' }}>device</span>
                                          }
                                        </td>
                                        <td style={TD}>{inc.detectedAt ? fmtDate(inc.detectedAt) : '—'}</td>
                                        <td style={TD}>{inc.effectiveEnd  ? fmtDate(inc.effectiveEnd)  : '—'}</td>
                                        <td style={{ ...TD, fontWeight: 700, color: inc.downtimeMinutes > 480 ? SLA_ERR_COLOR : '#94a3b8' }}>
                                          {inc.downtimeHuman}
                                          {inc.downtimeMinutes > 480 && <span style={{ marginLeft: '0.25rem' }}>⚠</span>}
                                        </td>
                                        <td style={{ ...TD, color: '#94a3b8', fontStyle: inc.resolutionNotes ? 'normal' : 'italic' }}>
                                          {inc.resolutionNotes || 'sin notas'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          }
        </>
      )}

      {!loading && !data && (
        <p className="inc__empty">No se pudo cargar el reporte SLA.</p>
      )}
    </div>
  )
}

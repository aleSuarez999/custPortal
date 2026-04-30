import { useEffect, useState, useCallback } from 'react'
import { useTheme } from '../hooks/useTheme'
import {
  getIncidentReport,
  getIncidentOrgs,
  updateIncidentWorkStatus,
  bulkAssignClaim,
  toggleIncidentSLA,
  getResolvedIncidentsReport,
  deleteIncident,
  reopenIncident,
  getRecurrenceReport,
} from '../utils/api'
import Text from '../components/Text'
import { OpenIncidentsTable }    from '../components/incidents/OpenIncidentsTable'
import { ResolvedReportTable }   from '../components/incidents/ResolvedReportTable'
import { RecurrenceTable }       from '../components/incidents/RecurrenceTable'
import { SlaReportTable }        from '../components/incidents/SlaReport'
import { PERIOD_OPTIONS, LS_ORG_KEY } from '../components/incidents/incidentConstants'
import { DowntimeReport }        from '../components/incidents/DowntimeReport'
import { jwtDecode }             from 'jwt-decode'

// ── Selector de organizacion ──────────────────────────────────────────────────
function OrgSelector({ orgs, value, onChange }) {
  return (
    <div className="inc__org-selector">
      <label className="inc__period-label">Organization:</label>
      <select className="inc__org-select" value={value} onChange={e => onChange(e.target.value)}>
        <option value="ALL">Ver todas</option>
        {orgs.map(o => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
    </div>
  )
}

// ── Pagina principal ──────────────────────────────────────────────────────────
export default function IncidentManagement() {
  const { theme, toggle } = useTheme()
  const C_ACCENT = theme === 'light' ? '#1d6fda' : '#00d4ff'

  const userRole = (() => {
    try {
      const token = localStorage.getItem('jwt_token')
      return token ? (jwtDecode(token).role ?? '') : ''
    } catch { return '' }
  })()
  const isAdmin = userRole === 'admin'

  const [orgs, setOrgs]               = useState([])
  const [selectedOrg, setSelectedOrg] = useState('')
  const [data, setData]               = useState(null)
  const [resolvedData, setResolvedData]     = useState(null)
  const [recurrenceData, setRecurrenceData] = useState(null)
  const [loading, setLoading]               = useState(false)
  const [loadingResolved, setLoadingResolved]     = useState(false)
  const [loadingRecurrence, setLoadingRecurrence] = useState(false)
  const [error, setError]   = useState(null)
  const [days, setDays]     = useState(7)
  const [activeTab, setActiveTab] = useState('open')

  const fetchData = async () => {
    if (!selectedOrg) return
    setLoading(true)
    setError(null)
    try {
      let incidentData    = null
      let resolvedDataTmp = null

      if (selectedOrg === 'ALL') {
        if (orgs.length === 0) return
        const results = await Promise.all(orgs.map(o => getIncidentReport(o.id, days)))
        incidentData = {
          ...results[0],
          recentOpen: results.flatMap(r => r?.recentOpen || []),
          kpis: {
            ...results[0]?.kpis,
            openIncidents: results.reduce((acc, r) => acc + (r?.kpis?.openIncidents || 0), 0),
          },
        }
        if (activeTab === 'resolved') {
          const resolvedResults = await Promise.all(orgs.map(o => getResolvedIncidentsReport(o.id, days)))
          resolvedDataTmp = {
            summary: { total: resolvedResults.reduce((acc, r) => acc + (r?.summary?.total || 0), 0) },
            incidents: resolvedResults.flatMap(r => r?.incidents || []),
          }
        }
      } else {
        incidentData = await getIncidentReport(selectedOrg, days)
        if (activeTab === 'resolved')
          resolvedDataTmp = await getResolvedIncidentsReport(selectedOrg, days)
      }

      setData(incidentData)
      if (resolvedDataTmp) setResolvedData(resolvedDataTmp)
    } catch {
      setError('Connection error.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getIncidentOrgs().then(list => {
      if (!list || list.length === 0) return
      setOrgs(list)
      setSelectedOrg('ALL')
    })
  }, [])

  useEffect(() => {
    if (selectedOrg) localStorage.setItem(LS_ORG_KEY, selectedOrg)
  }, [selectedOrg])

  useEffect(() => {
    if (!selectedOrg) return
    const interval = setInterval(() => { fetchData(); console.log('reconsultando') }, 300000)
    return () => clearInterval(interval)
  }, [selectedOrg, days, activeTab, orgs])

  useEffect(() => { fetchData() }, [selectedOrg, days, activeTab, orgs])

  useEffect(() => {
    if (activeTab !== 'resolved' || !selectedOrg) return
    setLoadingResolved(true)
    getResolvedIncidentsReport(selectedOrg, days)
      .then(resp => setResolvedData(resp || null))
      .finally(() => setLoadingResolved(false))
  }, [activeTab, selectedOrg, days])

  useEffect(() => {
    if (activeTab !== 'recurrence' || !selectedOrg) return
    setLoadingRecurrence(true)
    const orgParam = selectedOrg === 'ALL' ? null : selectedOrg
    getRecurrenceReport(orgParam, days)
      .then(resp => setRecurrenceData(resp || null))
      .finally(() => setLoadingRecurrence(false))
  }, [activeTab, selectedOrg, days])

  const handleSaveIncident = useCallback(async (id, updates) => {
    const updated = await updateIncidentWorkStatus(id, updates)
    if (!updated) return false
    if (updates.workStatus === 'resolved') {
      setData(prev => prev ? {
        ...prev,
        recentOpen: prev.recentOpen.filter(i => i._id !== id),
        kpis: { ...prev.kpis, openIncidents: Math.max(0, prev.kpis.openIncidents - 1) },
      } : prev)
    } else {
      setData(prev => prev ? {
        ...prev,
        recentOpen: prev.recentOpen.map(i =>
          i._id === id ? {
            ...i,
            workStatus:      updates.workStatus      ?? i.workStatus,
            claimNumber:     updates.claimNumber     ?? i.claimNumber,
            resolutionNotes: updates.resolutionNotes ?? i.resolutionNotes,
            detectedAt:      updates.detectedAt      ?? i.detectedAt,
          } : i
        ),
      } : prev)
    }
    return true
  }, [])

  const handleToggleSLA = useCallback(async (id, countsSLA) => {
    const updated = await toggleIncidentSLA(id, countsSLA)
    if (!updated) return
    setData(prev => prev ? {
      ...prev,
      recentOpen: prev.recentOpen.map(i => i._id === id ? { ...i, countsSLA } : i),
    } : prev)
  }, [])

  const handleNewIncident = useCallback(incident => {
    if (!incident) return
    setData(prev => prev ? {
      ...prev,
      recentOpen: [incident, ...prev.recentOpen],
      kpis: { ...prev.kpis, openIncidents: prev.kpis.openIncidents + 1 },
    } : prev)
  }, [])

  const handleBulkClaim = useCallback(async (ids, claimNumber, workStatus, resolutionNotes = '') => {
    const modified = await bulkAssignClaim(ids, claimNumber, workStatus, resolutionNotes)
    if (modified === null) return null
    setData(prev => {
      if (!prev) return prev
      const updatedOpen = prev.recentOpen
        .map(i => ids.includes(i._id)
          ? { ...i, claimNumber, workStatus: workStatus ?? i.workStatus, resolutionNotes: resolutionNotes || i.resolutionNotes }
          : i
        )
        .filter(i => workStatus !== 'resolved' || !ids.includes(i._id))
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
    setResolvedData(prev => prev ? {
      ...prev,
      incidents: prev.incidents.map(i => String(i._id) === String(id) ? { ...i, countsSLA } : i),
    } : prev)
  }, [])

  const handleSaveResolved = useCallback(async (id, updates) => {
    const updated = await updateIncidentWorkStatus(id, updates)
    if (!updated) return false
    setResolvedData(prev => prev ? {
      ...prev,
      incidents: prev.incidents.map(i =>
        String(i._id) === String(id) ? {
          ...i,
          resolutionNotes: updates.resolutionNotes ?? i.resolutionNotes,
          detectedAt:      updates.detectedAt      ?? i.detectedAt,
          resolvedAt:      updates.resolvedAt      ?? i.resolvedAt,
        } : i
      ),
    } : prev)
    return true
  }, [])

  const handleReopenIncident = useCallback(async id => {
    const incident = await reopenIncident(id)
    if (!incident) return
    setResolvedData(prev => prev ? { ...prev, incidents: prev.incidents.filter(i => String(i._id) !== String(id)) } : prev)
    setData(prev => prev ? {
      ...prev,
      recentOpen: [incident, ...prev.recentOpen],
      kpis: { ...prev.kpis, openIncidents: (prev.kpis.openIncidents || 0) + 1 },
    } : prev)
  }, [])

  const handleDeleteIncident = useCallback(async (id, inc) => {
    const label = inc?.deviceSerial || id
    if (!window.confirm(`Eliminar el registro "${label}" de la base de datos? Esta accion no se puede deshacer.`)) return
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
      <div className="inc__header">
        <div className="inc__header-left">
          <Text as="p" className="inc__subtitle">
            Service Availability &amp; Incident reporting — infrastructure, network and managed device level
          </Text>
        </div>
        <div className="inc__controls">
          {orgs.length > 0 && (
            <OrgSelector orgs={orgs} value={selectedOrg} onChange={setSelectedOrg} />
          )}
          <div className="inc__period-selector">
            <span className="inc__period-label">Period:</span>
            {PERIOD_OPTIONS.map(d => (
              <button key={d}
                className={`inc__period-btn${days === d ? ' inc__period-btn--active' : ''}`}
                onClick={() => setDays(d)}>
                {d}d
              </button>
            ))}
          </div>
          <button
            onClick={toggle}
            title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.22rem 0.75rem', borderRadius: 20,
              border: `1px solid ${theme === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)'}`,
              background: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
              color: theme === 'light' ? '#334155' : '#94a3b8',
              cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'inherit',
              letterSpacing: '0.04em', transition: 'all 0.2s', alignSelf: 'flex-end',
            }}
          >
            {theme === 'dark' ? '☀ Light' : '◑ Dark'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="inc__loading">
          <span className="inc__spinner" />
          Loading incident data for <strong style={{ color: C_ACCENT, marginLeft: '0.3rem' }}>{orgName}</strong>…
        </div>
      )}
      {error && <div className="inc__error">{error}</div>}

      {!loading && data && (
        <>
          <div className="inc__tabs">
            <button className={`inc__tab${activeTab === 'open' ? ' inc__tab--active' : ''}`}
              onClick={() => setActiveTab('open')}>
              Open Incidents
              <span className="inc__badge inc__badge--count" style={{ marginLeft: '0.5rem' }}>
                {data.recentOpen?.length ?? data.kpis.openIncidents}
              </span>
            </button>
            <button className={`inc__tab${activeTab === 'resolved' ? ' inc__tab--active' : ''}`}
              onClick={() => setActiveTab('resolved')}>
              Resolved Report
            </button>
            <button className={`inc__tab${activeTab === 'recurrence' ? ' inc__tab--active' : ''}`}
              onClick={() => setActiveTab('recurrence')}>
              Reincidencias
            </button>
            <button className={`inc__tab${activeTab === 'downtime' ? ' inc__tab--active' : ''}`}
              onClick={() => setActiveTab('downtime')}>
              Downtime Mensual
            </button>
            {isAdmin && (
              <button className={`inc__tab${activeTab === 'sla' ? ' inc__tab--active' : ''}`}
                onClick={() => setActiveTab('sla')}>
                SLA Mensual
              </button>
            )}
          </div>

          {activeTab === 'open' && (
            <div className="inc__panel">
              <Text as="h3" className="inc__panel-title">
                Open Incidents — {orgName}
              </Text>
              <OpenIncidentsTable
                rows={[...data.recentOpen].sort((a, b) => {
                  const aUp = a.workStatus === 'suspended' && (a.recurrenceCount ?? 0) > 0
                  const bUp = b.workStatus === 'suspended' && (b.recurrenceCount ?? 0) > 0
                  if (aUp && !bUp) return -1
                  if (bUp && !aUp) return 1
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

          {activeTab === 'resolved' && (
            loadingResolved
              ? <div className="inc__loading"><span className="inc__spinner" /> Loading resolved report…</div>
              : <ResolvedReportTable data={resolvedData}
                  onDelete={handleDeleteIncident}
                  onToggleSLA={handleToggleSLAResolved}
                  onSave={handleSaveResolved}
                  onReopen={handleReopenIncident} />
          )}

          {activeTab === 'recurrence' && (
            loadingRecurrence
              ? <div className="inc__loading"><span className="inc__spinner" /> Cargando reincidencias…</div>
              : <RecurrenceTable data={recurrenceData} />
          )}

          {activeTab === 'downtime' && (
            <DowntimeReport selectedOrg={selectedOrg} />
          )}

          {activeTab === 'sla' && isAdmin && (
            <SlaReportTable selectedOrg={selectedOrg} />
          )}

          <div className="inc__footer-note">
            Data from MongoDB · {orgName} · Period: last {days} days · Since {new Date(data.period.since).toLocaleDateString('en-GB')}
          </div>
        </>
      )}
    </div>
  )
}

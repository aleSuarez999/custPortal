import { useEffect, useState } from 'react'
import api from '../../utils/api'

export default function OpenIncidentsPanel() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [orgs, setOrgs] = useState([])
  const [orgId, setOrgId] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        const [orgsResp, reportResp] = await Promise.all([
          api.get('/incidents/orgs'),
          api.get('/incidents/report', {
            params: {
              orgId: orgId || undefined,
              days: 30
            }
          })
        ])

        setOrgs(orgsResp.data.orgs || [])
        setData(reportResp.data)
      } catch (err) {
        console.error('Error loading open incidents', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [orgId])

  if (loading) {
    return <p>Cargando incidentes abiertos...</p>
  }

  return (
    <section className="card mb-5">
      <header className="card__header">
        <h2>Open Incidents</h2>
      </header>

      <div className="card__body">
        {/* Org filter */}
        <div className="form mb-3">
          <label>
            Organization
            <select
              value={orgId}
              onChange={e => setOrgId(e.target.value)}
            >
              <option value="">All</option>
              {orgs.map(o => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* KPIs */}
        <div className="kpi-grid mb-4">
          <div className="kpi">
            <span>Total</span>
            <strong>{data.kpis.totalIncidents}</strong>
          </div>
          <div className="kpi">
            <span>Open</span>
            <strong>{data.kpis.openIncidents}</strong>
          </div>
          <div className="kpi">
            <span>Resolved</span>
            <strong>{data.kpis.resolvedIncidents}</strong>
          </div>
        </div>

        {/* Open incidents table */}
        <table className="table">
          <thead>
            <tr>
              <th>Org</th>
              <th>Network</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Detected At</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.recentOpen.map(inc => (
              <tr key={inc._id}>
                <td>{inc.orgId}</td>
                <td>{inc.networkName}</td>
                <td>{inc.incidentType}</td>
                <td>{inc.severity}</td>
                <td>
                  {new Date(inc.detectedAt).toLocaleString()}
                </td>
                <td>{inc.workStatus}</td>
              </tr>
            ))}

            {data.recentOpen.length === 0 && (
              <tr>
                <td colSpan="6">No open incidents</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
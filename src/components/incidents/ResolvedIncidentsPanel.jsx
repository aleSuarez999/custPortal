import { useEffect, useState } from 'react'
import api from '../../utils/api'

export default function ResolvedIncidentsPanel() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        const resp = await api.get('/incidents/resolved-report', {
          params: { days: 30 }
        })

        setData(resp.data)
      } catch (err) {
        console.error('Error loading resolved incidents', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return <p>Cargando incidentes resueltos...</p>
  }

  return (
    <section className="card">
      <header className="card__header">
        <h2>Resolved Incidents</h2>
      </header>

      <div className="card__body">
        <table className="table">
          <thead>
            <tr>
              <th>Org</th>
              <th>Network</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Detected</th>
              <th>Resolved</th>
              <th>Downtime</th>
            </tr>
          </thead>
          <tbody>
            {data.incidents.map(inc => (
              <tr key={inc._id}>
                <td>{inc.orgId}</td>
                <td>{inc.networkName}</td>
                <td>{inc.incidentType}</td>
                <td>{inc.severity}</td>
                <td>
                  {new Date(inc.detectedAt).toLocaleString()}
                </td>
                <td>
                  {new Date(inc.manualResolvedAt || inc.resolvedAt).toLocaleString()}
                </td>
                <td>{inc.downtimeHuman}</td>
              </tr>
            ))}

            {data.incidents.length === 0 && (
              <tr>
                <td colSpan="7">No resolved incidents</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
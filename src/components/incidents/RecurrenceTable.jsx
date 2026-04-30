import { COLOR_ACCENT, COLOR_MUTED, COLOR_WARNING, COLOR_ERROR } from './incidentConstants'
import Text from '../Text'

export function RecurrenceTable({ data }) {
  if (!data) return <p className="inc__empty">No hay datos de reincidencias para este periodo.</p>

  const networks = data.networks ?? data.recurrences ?? []

  if (networks.length === 0)
    return <p className="inc__empty">Sin reincidencias en el periodo seleccionado.</p>

  return (
    <div className="inc__panel">
      <Text as="h3" className="inc__panel-title">
        Reincidencias — caidas recuperadas automaticamente
        <span className="inc__badge inc__badge--count">{networks.length}</span>
      </Text>
      <p className="inc__table-hint">
        Sitios con mas de una caida que se restablecion sola en el periodo. No incluye incidentes cerrados manualmente.
      </p>
      <div className="inc__table-wrap">
        <table className="inc__table">
          <thead>
            <tr>
              <th>Network</th>
              <th>WAN</th>
              <th style={{ textAlign: 'center' }}>Caidas</th>
              <th>Downtime total</th>
              <th>Prom.</th>
            </tr>
          </thead>
          <tbody>
            {networks.map((n, i) => {
              const count = n.count ?? n.occurrences ?? 0
              const iface = n.uplinkInterface
              return (
                <tr key={`${n.networkId}-${iface}-${i}`}>
                  <td className="inc__td-mono">{n.networkName || '—'}</td>
                  <td className="inc__td-mono">
                    {iface
                      ? <span className="inc__badge" style={{
                          background: 'rgba(0,212,255,0.08)', color: '#00d4ff',
                          border: '1px solid rgba(0,212,255,0.25)', fontFamily: 'monospace', fontSize: '0.72rem',
                        }}>{iface}</span>
                      : <span style={{ color: '#64748b', fontSize: '0.72rem' }}>device</span>
                    }
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="inc__badge" style={{
                      background: count >= 5 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                      color:  count >= 5 ? COLOR_ERROR : COLOR_WARNING,
                      border: `1px solid ${count >= 5 ? COLOR_ERROR : COLOR_WARNING}44`,
                      fontWeight: 700,
                    }}>
                      {count}
                    </span>
                  </td>
                  <td className="inc__td-mono">{n.totalDowntimeHuman ?? '—'}</td>
                  <td className="inc__td-mono" style={{ color: '#64748b' }}>{n.avgDowntimeHuman ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

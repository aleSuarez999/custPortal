import IpWhoisTooltip from '../IpWhoisTooltip'

export default function IncidentWanDetail({ detail, inc }) {
  if (!detail) return <p className="inc__empty">Sin detalle WAN para esta red.</p>

  const wanLinks = detail.wanLinks || []

  return (
    <div className="inc__table-wrapper">
      <p className="vpn__peer-type-label" style={{ marginBottom: '0.35rem' }}>
        WAN LINKS
      </p>

      <table className="inc__table">
        <thead>
          <tr>
            <th>Iface</th>
            <th>Estado</th>
            <th>IP Privada</th>
            <th>IP Pública</th>
            <th>Lat.</th>
            <th>Loss</th>
          </tr>
        </thead>

        <tbody>
          {wanLinks.map((w, i) => {
            const isFailed = w.status === 'failed'
            const isIncidentWan = inc?.uplinkInterface && w.interface === inc.uplinkInterface

            return (
              <tr
                key={i}
                style={{
                  borderLeft: isFailed
                    ? '3px solid #ef4444'
                    : isIncidentWan
                    ? '3px solid #f59e0b'
                    : '3px solid transparent',
                  background: isFailed
                    ? 'rgba(239,68,68,0.05)'
                    : isIncidentWan
                    ? 'rgba(245,158,11,0.06)'
                    : undefined,
                }}
              >
                <td className="inc__td-mono">{w.interface}</td>

                <td>
                  <span className="inc__badge">{w.status}</span>
                  {isIncidentWan && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: '0.65rem',
                        color: '#f59e0b',
                        fontFamily: 'monospace',
                      }}
                    >
                      ← incidente
                    </span>
                  )}
                </td>

                <td className="inc__td-mono">
                  {w.ip ? <IpWhoisTooltip ip={w.ip} /> : '—'}
                </td>

                <td className="inc__td-mono">
                  {w.publicIp ? <IpWhoisTooltip ip={w.publicIp} /> : '—'}
                </td>

                <td className="inc__td-mono">{w.latencyMs ?? '—'}</td>
                <td className="inc__td-mono">{w.lossPercent ?? '—'}</td>
              </tr>
            )
          })}

          {wanLinks.length === 0 && (
            <tr>
              <td colSpan={6} className="inc__empty">
                Sin datos WAN
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

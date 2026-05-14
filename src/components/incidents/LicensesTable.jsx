import { useEffect, useState } from 'react'
import { getOrgLicensesOverview } from '../../utils/api'

const COLOR_ACCENT = '#00d4ff'
const COLOR_MUTED  = '#64748b'

const LICENSE_LABELS = {
  ENT:          'Enterprise',
  'ENT-Upg':    'Enterprise Upg',
  SEC:          'Adv Security',
  'SDWAN-PLUS': 'Secure SD-WAN+',
  'SD-WAN+':    'Secure SD-WAN+',
}

function StatusBadge({ count, color, label }) {
  if (!count) return null
  return (
    <span title={label} style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
      fontSize: '0.68rem', fontWeight: 600, fontFamily: 'monospace',
      color, background: color + '18',
      border: `1px solid ${color}44`,
      borderRadius: 4, padding: '0.1rem 0.4rem', marginRight: '0.25rem',
    }}>
      {label} {count}
    </span>
  )
}

function OrgLicenseRow({ org }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getOrgLicensesOverview(org.id)
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [org.id])

  const states  = data?.states  || {}
  const types   = data?.licenseTypes || []
  const active  = states.active?.count   ?? 0
  const expired = states.expired?.count  ?? 0
  const expWarn = states.expiring?.warning?.expiringCount  ?? 0
  const expCrit = states.expiring?.critical?.expiringCount ?? 0

  return (
    <tr style={{ borderBottom: '1px solid #1e293b' }}>
      <td style={{ fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', padding: '0.5rem 0.75rem' }}>
        {org.name}
      </td>
      <td style={{ padding: '0.5rem 0.75rem' }}>
        {loading
          ? <span style={{ color: COLOR_MUTED, fontSize: '0.75rem' }}>cargando...</span>
          : !data
          ? <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>sin datos</span>
          : (
            <>
              <StatusBadge count={active}  color="#10b981" label="activas" />
              <StatusBadge count={expired} color="#ef4444" label="venc." />
              <StatusBadge count={expCrit} color="#f97316" label="venc. <14d" />
              <StatusBadge count={expWarn} color="#f59e0b" label="venc. <90d" />
            </>
          )
        }
      </td>
      <td style={{ padding: '0.5rem 0.75rem' }}>
        {!loading && data && types.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {types.map((t, i) => (
              <span key={i} style={{
                fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 600,
                color: COLOR_ACCENT,
                background: 'rgba(0,212,255,0.08)',
                border: '1px solid rgba(0,212,255,0.25)',
                borderRadius: 4, padding: '0.1rem 0.4rem',
              }}>
                {LICENSE_LABELS[t.licenseType] ?? t.licenseType}
                {t.counts?.unassigned != null && (
                  <span style={{ color: COLOR_MUTED, fontWeight: 400 }}>
                    {' '}({t.counts.unassigned} no asig.)
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </td>
      <td style={{ padding: '0.5rem 0.75rem', color: COLOR_MUTED, fontSize: '0.72rem', fontFamily: 'monospace' }}>
        {!loading && data?.expirationDate}
      </td>
    </tr>
  )
}

export function LicensesTable({ orgs }) {
  if (!orgs || orgs.length === 0)
    return <p style={{ color: COLOR_MUTED }}>No hay organizaciones cargadas.</p>

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse',
        fontSize: '0.82rem', color: '#cbd5e1',
      }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #1e293b' }}>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: COLOR_MUTED, fontWeight: 600 }}>Organizacion</th>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: COLOR_MUTED, fontWeight: 600 }}>Estado</th>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: COLOR_MUTED, fontWeight: 600 }}>Tipos</th>
            <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: COLOR_MUTED, fontWeight: 600 }}>Vencimiento</th>
          </tr>
        </thead>
        <tbody>
          {orgs.map(org => (
            <OrgLicenseRow key={org.id} org={org} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

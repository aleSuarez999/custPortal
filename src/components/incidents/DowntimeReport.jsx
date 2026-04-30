import { useState, useEffect } from 'react'
import { getSlaReport, getOrgBrandingLogo } from '../../utils/api'
import { KpiCard } from './KpiCard'
import { fmtDate } from './incidentConstants'
import Text from '../Text'
import personalLogoRaw from '../../assets/personal-tech-logo-blanco.svg?raw'

function buildPrintHtml({ rows, month, sitesCount, orgName, clientLogoUrl }) {
  // Encode the SVG as a data URL — works in any popup window without network requests
  const personalLogo = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(personalLogoRaw)

  const clientLogoHtml = clientLogoUrl
    ? `<img src="${clientLogoUrl}" alt="logo cliente" style="height:44px; object-fit:contain; max-width:160px;" />`
    : `<span style="color:#94a3b8; font-size:12px; font-style:italic;">${orgName || 'Cliente'}</span>`

  const rowsHtml = rows.map(r => `
    <tr>
      <td>${r.networkName ?? '—'}</td>
      <td>${r.orgName ?? '—'}</td>
      <td>${r.detectedAt ? new Date(r.detectedAt).toLocaleString('es-AR') : '—'}</td>
      <td>${r.effectiveEnd ? new Date(r.effectiveEnd).toLocaleString('es-AR') : '—'}</td>
      <td style="font-weight:700">${r.downtimeHuman ?? '—'}</td>
      <td>${r.claimNumber ?? '—'}</td>
      <td style="color:#475569">${r.resolutionNotes ?? ''}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Downtime Mensual ${month}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; }

    /* ── Header ── */
    .report-header {
      background: #0d1520;
      color: #fff;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .report-header img.personal-logo { height: 36px; object-fit: contain; }
    .report-header .title-block { text-align: center; flex: 1; padding: 0 16px; }
    .report-header .title-block h1 { font-size: 15px; font-weight: 700; color: #e2e8f0; margin-bottom: 2px; }
    .report-header .title-block .subtitle { font-size: 10px; color: #64748b; }
    .report-header .client-logo { display: flex; align-items: center; justify-content: flex-end; min-width: 120px; }

    /* ── Body ── */
    .body { padding: 0 24px 24px; }
    .meta { color: #64748b; font-size: 10px; margin-bottom: 14px; }
    .kpis { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .kpi { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 16px; background: #f8fafc; }
    .kpi-label { font-size: 9px; color: #64748b; display: block; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.04em; }
    .kpi-value { font-size: 22px; font-weight: 700; color: #0f172a; }

    table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    th { background: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: left;
         padding: 6px 8px; color: #334155; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.05em; }
    td { border-bottom: 1px solid #e2e8f0; padding: 5px 8px; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    tr:last-child td { border-bottom: none; }

    .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0;
              font-size: 9px; color: #94a3b8; text-align: center; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <img class="personal-logo" src="${personalLogo}" alt="Personal Tech" />
    <div class="title-block">
      <h1>Reporte de Downtime Mensual</h1>
      <div class="subtitle">Período: ${month} · Generado: ${new Date().toLocaleString('es-AR')}</div>
    </div>
    <div class="client-logo">${clientLogoHtml}</div>
  </div>

  <div class="body">
    <p class="meta">Sitios con incidentes resueltos en el período seleccionado.</p>

    <div class="kpis">
      <div class="kpi">
        <span class="kpi-label">Sitios evaluados</span>
        <span class="kpi-value">${sitesCount}</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">Incidentes registrados</span>
        <span class="kpi-value">${rows.length}</span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Sitio</th>
          <th>Org</th>
          <th>Caída</th>
          <th>Up</th>
          <th>Downtime</th>
          <th>Claim #</th>
          <th>Notas</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <div class="footer">
      Personal Tech Solutions — uso interno NOC
    </div>
  </div>

  <script>window.onload = () => setTimeout(() => window.print(), 500)<\/script>
</body>
</html>`
}

export function DowntimeReport({ selectedOrg }) {
  const defaultMonth = () => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
  }

  const [month, setMonth]         = useState(defaultMonth)
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(false)
  const [clientLogoUrl, setClientLogoUrl] = useState(null)
  const [orgName, setOrgName]     = useState('')

  useEffect(() => {
    if (!selectedOrg) return
    setLoading(true)
    const orgParam = selectedOrg === 'ALL' ? null : selectedOrg
    getSlaReport(month, orgParam)
      .then(resp => setData(resp || null))
      .finally(() => setLoading(false))
  }, [month, selectedOrg])

  useEffect(() => {
    if (!selectedOrg || selectedOrg === 'ALL') {
      setClientLogoUrl(null)
      setOrgName('')
      return
    }
    getOrgBrandingLogo(selectedOrg).then(url => setClientLogoUrl(url || null))
  }, [selectedOrg])

  useEffect(() => {
    if (data?.sites?.[0]?.orgName) setOrgName(data.sites[0].orgName)
  }, [data])

  const rows = data
    ? data.sites.flatMap(site =>
        site.incidents.map(inc => ({
          ...inc,
          networkName: site.networkName,
          orgName:     site.orgName,
        }))
      )
    : []

  const handlePdf = () => {
    if (!data) return
    const win = window.open('', '_blank', 'width=960,height=760')
    const html = buildPrintHtml({
      rows,
      month,
      sitesCount: data.summary.totalSites,
      orgName,
      clientLogoUrl,
    })
    win.document.write(html)
    win.document.close()
    win.focus()
  }

  const handleCsv = () => {
    if (!rows.length) return
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const fmtDt = d => d ? new Date(d).toLocaleString('es-AR') : ''
    const headers = ['Sitio', 'Org', 'Caida', 'Up', 'Downtime', 'Claim #', 'Notas']
    const body = rows.map(r => [
      esc(r.networkName),
      esc(r.orgName),
      esc(fmtDt(r.detectedAt)),
      esc(fmtDt(r.effectiveEnd)),
      esc(r.downtimeHuman),
      esc(r.claimNumber),
      esc(r.resolutionNotes),
    ].join(','))
    const csv = '\uFEFF' + [headers.map(esc).join(','), ...body].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `downtime-${month}${orgName ? '-' + orgName.replace(/[^a-z0-9]/gi, '_') : ''}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="inc__panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <Text as="h3" className="inc__panel-title" style={{ margin: 0 }}>
          Downtime Mensual — por Incidente
        </Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Mes:</span>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 4, color: 'inherit', cursor: 'pointer' }} />
          <button
            onClick={handlePdf}
            disabled={!data || rows.length === 0}
            style={{
              padding: '0.28rem 1rem', borderRadius: 4,
              border: `1px solid ${data && rows.length ? 'rgba(0,212,255,0.4)' : 'rgba(100,116,139,0.2)'}`,
              background: data && rows.length ? 'rgba(0,212,255,0.10)' : 'rgba(100,116,139,0.06)',
              color: data && rows.length ? '#00d4ff' : '#64748b',
              fontSize: '0.78rem', fontWeight: 600, cursor: data && rows.length ? 'pointer' : 'default',
              transition: 'all 0.15s',
            }}
          >
            ↓ Generar PDF
          </button>
          <button
            onClick={handleCsv}
            disabled={!data || rows.length === 0}
            style={{
              padding: '0.28rem 1rem', borderRadius: 4,
              border: `1px solid ${data && rows.length ? 'rgba(16,185,129,0.4)' : 'rgba(100,116,139,0.2)'}`,
              background: data && rows.length ? 'rgba(16,185,129,0.10)' : 'rgba(100,116,139,0.06)',
              color: data && rows.length ? '#10b981' : '#64748b',
              fontSize: '0.78rem', fontWeight: 600, cursor: data && rows.length ? 'pointer' : 'default',
              transition: 'all 0.15s',
            }}
          >
            ↓ Exportar CSV
          </button>
        </div>
      </div>

      {loading && (
        <div className="inc__loading"><span className="inc__spinner" /> Cargando downtime…</div>
      )}

      {!loading && data && (
        <>
          <div className="inc__kpi-row" style={{ marginBottom: '1rem' }}>
            <KpiCard label="Sitios evaluados"      value={data.summary.totalSites} accent />
            <KpiCard label="Incidentes registrados" value={rows.length} />
          </div>

          {rows.length === 0
            ? <p className="inc__empty">No hay incidentes resueltos en este periodo.</p>
            : (
              <div className="inc__table-wrap">
                <table className="inc__table">
                  <thead>
                    <tr>
                      <th>Sitio</th>
                      <th>Org</th>
                      <th>Caida</th>
                      <th>Up</th>
                      <th>Downtime</th>
                      <th>Claim #</th>
                      <th>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r._id || i}>
                        <td className="inc__td-mono">{r.networkName ?? '—'}</td>
                        <td className="inc__td-mono" style={{ color: '#64748b', fontSize: '0.72rem' }}>
                          {r.orgName ?? '—'}
                        </td>
                        <td className="inc__td-mono">{r.detectedAt  ? fmtDate(r.detectedAt)  : '—'}</td>
                        <td className="inc__td-mono">{r.effectiveEnd ? fmtDate(r.effectiveEnd) : '—'}</td>
                        <td className="inc__td-mono" style={{ fontWeight: 600 }}>{r.downtimeHuman ?? '—'}</td>
                        <td className="inc__td-mono" style={{ color: '#00d4ff' }}>{r.claimNumber || '—'}</td>
                        <td style={{ fontSize: '0.74rem', color: r.resolutionNotes ? 'inherit' : '#64748b',
                          fontStyle: r.resolutionNotes ? 'normal' : 'italic' }}>
                          {r.resolutionNotes || 'sin notas'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </>
      )}

      {!loading && !data && (
        <p className="inc__empty">No se pudo cargar el reporte.</p>
      )}
    </div>
  )
}

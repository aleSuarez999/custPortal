import { useState } from 'react'
import IpWhoisTooltip from '../IpWhoisTooltip'
import { createManualIncident, getMgSims } from '../../utils/api'

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  online:   { color: '#10b981', label: 'Online'   },
  offline:  { color: '#ef4444', label: 'Offline'  },
  alerting: { color: '#f59e0b', label: 'Alerting' },
  dormant:  { color: '#64748b', label: 'Dormant'  },
}

function StatusDot({ status }) {
  const cfg = STATUS_CFG[status] || { color: '#64748b', label: status || '—' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: cfg.color,
        boxShadow: `0 0 4px ${cfg.color}88`,
        flexShrink: 0,
      }} />
      <span style={{ color: cfg.color, fontSize: '0.78rem', fontWeight: 600 }}>
        {cfg.label}
      </span>
    </span>
  )
}

const TYPE_ICON = { MX: '📟', MG: '📶', MS: '🔀', MR: '🛜', OTHER: '📦' }

// ── Sección WAN links del MX + dispositivos downstream offline ────────────────
function WanLinksTable({ wanLinks, incidentInterface, networkDevices }) {
  if (!wanLinks?.length) return null

  // MS/MR offline que se muestran como filas adicionales bajo las WANs
  const downstreamOffline = (networkDevices || []).filter(
    d => (d.type === 'MS' || d.type === 'MR') &&
         (d.status === 'offline' || d.status === 'alerting')
  )

  const TD = { padding: '0.15rem 0.5rem', fontFamily: 'monospace' }

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: '#64748b', textAlign: 'left' }}>
            <th style={TD}>Iface / Equipo</th>
            <th style={TD}>Estado</th>
            <th style={TD}>IP / Serial</th>
            <th style={TD}>IP Pública</th>
            <th style={TD}>Lat.</th>
            <th style={TD}>Loss</th>
          </tr>
        </thead>
        <tbody>
          {/* Filas WAN del MX */}
          {wanLinks.map((w, i) => {
            const isFailed = w.status === 'failed' || w.status === 'not connected'
            const isIncWan = incidentInterface && w.interface === incidentInterface
            return (
              <tr key={`wan-${i}`} style={{
                borderLeft: isFailed
                  ? '3px solid #ef4444'
                  : isIncWan ? '3px solid #f59e0b' : '3px solid transparent',
                background: isFailed
                  ? 'rgba(239,68,68,0.06)'
                  : isIncWan ? 'rgba(245,158,11,0.06)' : undefined,
              }}>
                <td style={TD}>{w.interface}</td>
                <td style={TD}>
                  <span style={{ color: isFailed ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                    {w.status}
                  </span>
                  {isIncWan && <span style={{ marginLeft: 6, fontSize: '0.65rem', color: '#f59e0b' }}>← incidente</span>}
                </td>
                <td style={TD}>{w.ip ? <IpWhoisTooltip ip={w.ip} /> : '—'}</td>
                <td style={TD}>{w.publicIp ? <IpWhoisTooltip ip={w.publicIp} /> : '—'}</td>
                <td style={TD}>{w.latencyMs ?? '—'}</td>
                <td style={TD}>{w.lossPercent ?? '—'}</td>
              </tr>
            )
          })}

          {/* Filas MS/MR offline (cascade) */}
          {downstreamOffline.map((dev, i) => (
            <tr key={`dev-${i}`} style={{
              borderLeft: '3px solid #f59e0b',
              background: 'rgba(245,158,11,0.04)',
            }}>
              <td style={TD}>
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                  {TYPE_ICON[dev.type]} {dev.type}
                </span>
              </td>
              <td style={TD}>
                <span style={{ color: '#ef4444', fontWeight: 600 }}>
                  {dev.status}
                </span>
                <span style={{ marginLeft: 6, fontSize: '0.65rem', color: '#f59e0b' }}>
                  ← sin salida
                </span>
              </td>
              <td style={TD}>
                <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                  {dev.serial}
                </span>
              </td>
              <td style={TD}>
                {dev.publicIp ? <IpWhoisTooltip ip={dev.publicIp} /> : '—'}
              </td>
              <td style={TD}>—</td>
              <td style={TD}>—</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Sección LTE del MG ────────────────────────────────────────────────────────
const LTE_FIELD = { fontSize: '0.7rem', fontFamily: 'monospace', color: '#94a3b8' }
const LTE_VAL   = { fontSize: '0.7rem', fontFamily: 'monospace', color: '#e2e8f0' }

function LteField({ label, value }) {
  if (value == null || value === '') return null
  return (
    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'baseline' }}>
      <span style={LTE_FIELD}>{label}</span>
      <span style={LTE_VAL}>{value}</span>
    </div>
  )
}

function LteDetail({ lteUplinks, imei }) {
  if (!lteUplinks?.length) return null
  return (
    <div style={{ marginTop: '0.45rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {lteUplinks.map((u, i) => {
        const lteDown   = u.status && u.status !== 'active' && u.status !== 'ready'
        const fromCache = !!u.fromCache
        return (
          <div key={i} style={{
            background: fromCache ? 'rgba(100,116,139,0.07)' : lteDown ? 'rgba(239,68,68,0.07)' : 'rgba(16,185,129,0.05)',
            border: `1px solid ${fromCache ? '#47556930' : lteDown ? '#ef444430' : '#10b98125'}`,
            borderRadius: 5, padding: '0.35rem 0.6rem',
          }}>
            {/* fila estado */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: lteDown ? '#ef4444' : '#10b981' }}>
                {u.interface}{u.status ? ` · ${u.status}` : ''}
              </span>
              {u.provider   && <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{u.provider}</span>}
              {u.signalType && <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{u.signalType}</span>}
              {u.ip         && <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#94a3b8' }}>{u.ip}</span>}
              {fromCache && (
                <span title={u.lastSeenAt ? `Último dato: ${new Date(u.lastSeenAt).toLocaleString('es-AR')}` : 'Dato en caché'}
                  style={{ fontSize: '0.62rem', color: '#64748b', fontStyle: 'italic', marginLeft: 'auto' }}>
                  ⏱ caché{u.lastSeenAt ? ` · ${new Date(u.lastSeenAt).toLocaleDateString('es-AR')}` : ''}
                </span>
              )}
            </div>
            {/* grilla de campos SIM/red */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.15rem 1.2rem' }}>
              {imei   != null && i === 0 && <LteField label="IMEI"   value={imei} />}
              <LteField label="ICCID"  value={u.iccid} />
              <LteField label="IMSI"   value={u.imsi} />
              <LteField label="MSISDN" value={u.msisdn} />
              <LteField label="APN"    value={u.apn} />
              {u.rsrp != null && <LteField label="RSRP" value={`${u.rsrp} dBm`} />}
              {u.rsrq != null && <LteField label="RSRQ" value={`${u.rsrq} dB`} />}
              {u.sinr != null && <LteField label="SINR" value={`${u.sinr} dB`} />}
              {u.rssi != null && <LteField label="RSSI" value={`${u.rssi} dBm`} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Panel de SIMs en tiempo real ──────────────────────────────────────────────
function SimDetail({ serial }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const fetch = async () => {
    setLoading(true); setError(null)
    const res = await getMgSims(serial)
    setLoading(false)
    if (!res) { setError('No se pudo obtener datos de la SIM'); return }
    setData(res)
  }

  if (!data && !loading && !error) {
    return (
      <button onClick={fetch} style={{
        marginTop: '0.4rem', fontSize: '0.7rem', padding: '0.2rem 0.6rem',
        background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.25)',
        borderRadius: 4, color: '#00d4ff', cursor: 'pointer',
      }}>
        ↺ Consultar SIM en tiempo real
      </button>
    )
  }

  if (loading) return <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.4rem' }}>Consultando SIM…</p>
  if (error)   return (
    <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>{error}</span>
      <button onClick={fetch} style={{ fontSize: '0.68rem', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>reintentar</button>
    </div>
  )

  const { sims = [], simOrdering = [], simFailover } = data
  return (
    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>SIM — TIEMPO REAL</span>
        <button onClick={fetch} title="Actualizar" style={{ fontSize: '0.7rem', background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}>↺</button>
        {simFailover && (
          <span style={{ fontSize: '0.65rem', color: '#64748b', marginLeft: 'auto' }}>
            Failover {simFailover.enabled ? `activo (${simFailover.timeout}s)` : 'inactivo'}
          </span>
        )}
      </div>

      {sims.map((sim, i) => {
        const isPrimary = sim.isPrimary
        const isInserted = sim.status === 'inserted'
        return (
          <div key={i} style={{
            borderRadius: 4, padding: '0.35rem 0.6rem',
            background: isInserted ? 'rgba(16,185,129,0.05)' : 'rgba(100,116,139,0.07)',
            border: `1px solid ${isInserted ? '#10b98120' : '#47556930'}`,
          }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isInserted ? '#10b981' : '#64748b' }}>
                {sim.slot?.toUpperCase()}
              </span>
              <span style={{ fontSize: '0.65rem', color: isInserted ? '#10b981' : '#64748b' }}>{sim.status || '—'}</span>
              {isPrimary && (
                <span style={{ fontSize: '0.62rem', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 3, padding: '0 0.3rem' }}>PRIMARY</span>
              )}
              {simOrdering.length > 0 && (
                <span style={{ fontSize: '0.62rem', color: '#475569', marginLeft: 'auto' }}>
                  orden: {simOrdering.indexOf(sim.slot) + 1}°
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.15rem 1.2rem' }}>
              {sim.iccid  && <LteField label="ICCID"  value={sim.iccid} />}
              {sim.imsi   && <LteField label="IMSI"   value={sim.imsi} />}
              {sim.msisdn && <LteField label="MSISDN" value={sim.msisdn} />}
            </div>
            {sim.apns?.length > 0 && (
              <div style={{ marginTop: '0.3rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                {sim.apns.map((apn, j) => (
                  <div key={j} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.15rem 1.2rem',
                    background: 'rgba(255,255,255,0.03)', borderRadius: 3, padding: '0.2rem 0.4rem' }}>
                    <LteField label="APN"  value={apn.name} />
                    {apn.authentication?.type && <LteField label="Auth" value={apn.authentication.type} />}
                    {apn.authentication?.username && <LteField label="User" value={apn.authentication.username} />}
                    {apn.allowedIpTypes?.length > 0 && <LteField label="IP" value={apn.allowedIpTypes.join(' / ')} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Mini-form para crear incidente manual en MG/MS/MR ────────────────────────
// Solo el panel del formulario; el trigger "+" vive en el header del DeviceCard.
function CreateIncidentPanel({ dev, orgId, networkId, onCreated, onClose }) {
  const [claim, setClaim]   = useState('')
  const [status, setStatus] = useState('active')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState(null)

  const handleCreate = async () => {
    setSaving(true)
    setMsg(null)
    const result = await createManualIncident({
      orgId,
      networkId,
      deviceSerial: dev.serial,
      deviceModel:  dev.model,
      deviceType:   dev.type,
      claimNumber:  claim,
      workStatus:   status,
    })
    setSaving(false)

    if (!result) {
      setMsg({ error: true, text: 'Error al crear el incidente' })
    } else if (result.conflict) {
      setMsg({ error: false, text: 'Ya existe un incidente abierto para este equipo' })
      onClose()
    } else {
      setMsg({ error: false, text: 'Incidente creado' })
      setClaim('')
      onClose()
      onCreated?.(result)
    }
  }

  return (
    <div style={{
      marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center',
      background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.2)',
      borderRadius: 4, padding: '0.4rem 0.6rem',
    }}>
      <input
        type="text"
        placeholder="Nro reclamo"
        value={claim}
        onChange={e => setClaim(e.target.value)}
        style={{
          fontSize: '0.75rem', padding: '0.2rem 0.4rem',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 4, color: '#e2e8f0', width: 130,
        }}
      />
      <select
        value={status}
        onChange={e => setStatus(e.target.value)}
        style={{
          fontSize: '0.75rem', padding: '0.2rem 0.4rem',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 4, color: '#e2e8f0',
        }}
      >
        <option value="active">Active</option>
        <option value="in_progress">In Progress</option>
      </select>
      <button
        onClick={handleCreate}
        disabled={saving}
        style={{
          fontSize: '0.72rem', padding: '0.2rem 0.6rem',
          background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
          borderRadius: 4, color: '#10b981', cursor: 'pointer',
        }}
      >
        {saving ? '…' : 'Confirmar'}
      </button>
      <button
        onClick={onClose}
        style={{
          fontSize: '0.72rem', padding: '0.2rem 0.4rem',
          background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
        }}
      >
        Cancelar
      </button>
      {msg && (
        <span style={{ fontSize: '0.7rem', color: msg.error ? '#ef4444' : '#10b981' }}>
          {msg.text}
        </span>
      )}
    </div>
  )
}

// ── Tarjeta de un dispositivo ─────────────────────────────────────────────────
function DeviceCard({ dev, inc, networkDevices, orgId, networkId, onManualIncidentCreated }) {
  const [formOpen, setFormOpen] = useState(false)
  const isDown    = dev.status === 'offline' || dev.status === 'alerting'
  const canCreate = dev.type !== 'MX'

  return (
    <div style={{
      borderRadius: 6,
      border: `1px solid ${isDown ? '#ef444444' : 'rgba(255,255,255,0.07)'}`,
      background: isDown ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.02)',
      padding: '0.5rem 0.75rem',
    }}>
      {/* ── Cabecera ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '1rem' }}>{TYPE_ICON[dev.type] || '📦'}</span>

        <span style={{ fontWeight: 700, fontSize: '0.8rem', color: isDown ? '#ef4444' : '#e2e8f0' }}>
          {dev.type}
        </span>

        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#94a3b8' }}>
          {dev.model || '—'}
        </span>

        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b' }}>
          {dev.serial}
        </span>

        {dev.name && (
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
            {dev.name}
          </span>
        )}

        <StatusDot status={dev.status} />

        {/* Spacer + elementos del lado derecho */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {dev.publicIp && (
            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b' }}>
              <IpWhoisTooltip ip={dev.publicIp} />
            </span>
          )}

          {canCreate && (
            <button
              title={formOpen ? 'Cerrar formulario' : 'Crear incidente manual'}
              onClick={() => setFormOpen(o => !o)}
              style={{
                width: 22, height: 22, borderRadius: '50%',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', lineHeight: 1, fontWeight: 700,
                background: formOpen ? 'rgba(100,116,139,0.2)' : 'rgba(0,212,255,0.1)',
                border: `1px solid ${formOpen ? 'rgba(100,116,139,0.4)' : 'rgba(0,212,255,0.35)'}`,
                color: formOpen ? '#64748b' : '#00d4ff',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              {formOpen ? '×' : '+'}
            </button>
          )}
        </div>
      </div>

      {/* ── Detalle WAN (solo MX) ── */}
      {dev.wanLinks && (
        <WanLinksTable
          wanLinks={dev.wanLinks}
          incidentInterface={inc?.uplinkInterface}
          networkDevices={networkDevices}
        />
      )}

      {/* ── Detalle LTE (solo MG) ── */}
      {dev.lteUplinks && (
        <LteDetail lteUplinks={dev.lteUplinks} imei={dev.imei} />
      )}

      {/* ── Consulta SIM en tiempo real (solo MG) ── */}
      {dev.type === 'MG' && (
        <SimDetail serial={dev.serial} />
      )}

      {/* ── Avisos ── */}
      {dev.type === 'MG' && dev.status === 'offline' && (
        <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', color: '#ef4444', fontWeight: 600 }}>
          ⚠ LTE no responde
        </div>
      )}
      {(dev.type === 'MS' || dev.type === 'MR') && isDown && (
        <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', color: '#f59e0b' }}>
          ⚠ Puede estar afectado por la caída del MX
        </div>
      )}

      {/* ── Formulario crear incidente ── */}
      {canCreate && formOpen && (
        <CreateIncidentPanel
          dev={dev}
          orgId={orgId}
          networkId={networkId}
          onClose={() => setFormOpen(false)}
          onCreated={onManualIncidentCreated}
        />
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function IncidentWanDetail({ detail, inc, onManualIncidentCreated }) {
  if (!detail) return <p className="inc__empty">Sin detalle WAN para esta red.</p>

  const networkDevices = detail.networkDevices || []
  const wanLinks       = detail.wanLinks       || []

  // Fallback: si no hay networkDevices (datos viejos), mostrar solo WANs
  if (networkDevices.length === 0) {
    return (
      <div className="inc__table-wrapper">
        <p className="vpn__peer-type-label" style={{ marginBottom: '0.35rem' }}>WAN LINKS</p>
        <table className="inc__table">
          <thead>
            <tr>
              <th>Iface</th><th>Estado</th><th>IP Privada</th>
              <th>IP Pública</th><th>Lat.</th><th>Loss</th>
            </tr>
          </thead>
          <tbody>
            {wanLinks.map((w, i) => (
              <tr key={i}>
                <td className="inc__td-mono">{w.interface}</td>
                <td>{w.status}</td>
                <td className="inc__td-mono">{w.ip ? <IpWhoisTooltip ip={w.ip} /> : '—'}</td>
                <td className="inc__td-mono">{w.publicIp ? <IpWhoisTooltip ip={w.publicIp} /> : '—'}</td>
                <td className="inc__td-mono">{w.latencyMs ?? '—'}</td>
                <td className="inc__td-mono">{w.lossPercent ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <p className="vpn__peer-type-label" style={{ marginBottom: '0.1rem' }}>
        EQUIPOS DE LA RED — {detail.networkName}
      </p>

      {networkDevices.map((dev, i) => (
        <DeviceCard
          key={i}
          dev={dev}
          inc={inc}
          networkDevices={networkDevices}
          orgId={detail.orgId}
          networkId={detail.networkId}
          onManualIncidentCreated={onManualIncidentCreated}
        />
      ))}
    </div>
  )
}

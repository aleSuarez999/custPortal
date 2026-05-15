import { useState, useEffect, useRef, useCallback } from 'react'
import { getContacts, createContact, updateContact, deleteContact } from '../../utils/api'

const EMPTY = { name: '', phone: '', email: '' }

export function ContactsPopup({ orgId, orgName, onClose, isReadonly }) {
  const [contacts, setContacts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving]       = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    setLoading(true)
    getContacts(orgId).then(list => { setContacts(list); setLoading(false) })
  }, [orgId])

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    if (editingId) {
      const updated = await updateContact(editingId, form)
      if (updated) setContacts(prev => prev.map(c => c._id === editingId ? updated : c))
      setEditingId(null)
    } else {
      const created = await createContact({ orgId, ...form })
      if (created) setContacts(prev => [...prev, created])
    }
    setForm(EMPTY)
    setSaving(false)
  }

  const handleEdit = useCallback(contact => {
    setEditingId(contact._id)
    setForm({ name: contact.name, phone: contact.phone || '', email: contact.email || '' })
  }, [])

  const handleDelete = useCallback(async id => {
    if (!window.confirm('¿Eliminar este contacto?')) return
    const ok = await deleteContact(id)
    if (ok) setContacts(prev => prev.filter(c => c._id !== id))
  }, [])

  const handleCancel = () => { setEditingId(null); setForm(EMPTY) }

  return (
    <div className="ctpop__overlay" onMouseDown={e => e.stopPropagation()}>
      <div className="ctpop" ref={ref}>
        <div className="ctpop__header">
          <span className="ctpop__title">👤 {orgName}</span>
          <button className="ctpop__close" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="ctpop__loading">Cargando…</div>
        ) : (
          <>
            <div className="ctpop__list">
              {contacts.length === 0
                ? <p className="ctpop__empty">Sin contactos cargados</p>
                : contacts.map(c => (
                    <div key={c._id} className="ctpop__item">
                      <div className="ctpop__item-info">
                        <span className="ctpop__name">{c.name}</span>
                        {c.phone && <span className="ctpop__detail">📞 {c.phone}</span>}
                        {c.email && <span className="ctpop__detail">✉ {c.email}</span>}
                      </div>
                      {!isReadonly && (
                        <div className="ctpop__item-actions">
                          <button className="ctpop__btn-edit" onClick={() => handleEdit(c)} title="Editar">✎</button>
                          <button className="ctpop__btn-delete" onClick={() => handleDelete(c._id)} title="Eliminar">✕</button>
                        </div>
                      )}
                    </div>
                  ))
              }
            </div>

            {!isReadonly && (
              <form className="ctpop__form" onSubmit={handleSubmit}>
                <p className="ctpop__form-title">{editingId ? 'Editar contacto' : 'Nuevo contacto'}</p>
                <input className="ctpop__input" placeholder="Nombre *" value={form.name} required
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <input className="ctpop__input" placeholder="Teléfono" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                <input className="ctpop__input" placeholder="Email" type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                <div className="ctpop__form-actions">
                  {editingId && (
                    <button type="button" className="ctpop__btn-cancel" onClick={handleCancel}>Cancelar</button>
                  )}
                  <button type="submit" className="ctpop__btn-save" disabled={saving}>
                    {saving ? '…' : editingId ? 'Guardar' : 'Agregar'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}

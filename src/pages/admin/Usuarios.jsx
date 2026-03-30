import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'

const emptyForm = {
  numero_documento: '',
  nombre: '', apellido: '', telefono: '', rol: '',
}

const MODAL_STATE = { IDLE: 'idle', SEARCHING: 'searching', NEW_PERSONA: 'new_persona', EXISTING: 'existing' }

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function Usuarios() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalState, setModalState] = useState(MODAL_STATE.IDLE)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const dniTimeout = useRef(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.users.list()
      setUsers(data ?? [])
    } catch {
      // error silencioso
    }
    setLoading(false)
  }

  function openModal() {
    setShowModal(true)
    setModalState(MODAL_STATE.IDLE)
    setForm(emptyForm)
    setFormError('')
  }

  function handleDniChange(dni) {
    setForm(f => ({ ...f, numero_documento: dni, nombre: '', apellido: '', telefono: '' }))
    setFormError('')

    clearTimeout(dniTimeout.current)
    if (dni.trim().length < 7) {
      setModalState(MODAL_STATE.IDLE)
      return
    }

    setModalState(MODAL_STATE.SEARCHING)
    dniTimeout.current = setTimeout(() => searchDni(dni.trim()), 600)
  }

  async function searchDni(dni) {
    try {
      const result = await api.users.search(dni)

      if (!result.found) {
        setModalState(MODAL_STATE.NEW_PERSONA)
        return
      }

      if (result.tieneAcceso) {
        setFormError('Este usuario ya tiene acceso a este sistema.')
        setModalState(MODAL_STATE.IDLE)
        return
      }

      setForm(f => ({
        ...f,
        nombre: result.persona.nombre,
        apellido: result.persona.apellido,
      }))

      setModalState(MODAL_STATE.EXISTING)
    } catch {
      setModalState(MODAL_STATE.IDLE)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')

    if (!form.rol.trim()) {
      setFormError('El rol es obligatorio.')
      return
    }

    if (modalState === MODAL_STATE.NEW_PERSONA) {
      if (!form.nombre.trim() || !form.apellido.trim()) {
        setFormError('Nombre y apellido son obligatorios.')
        return
      }
    }

    setSaving(true)
    try {
      await api.users.create({
        numero_documento: form.numero_documento,
        nombre: form.nombre || undefined,
        apellido: form.apellido || undefined,
        telefono: form.telefono || undefined,
        rol: form.rol,
      })
      setShowModal(false)
      load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActivo(user) {
    if (user.id === currentUser.id) return
    setActionLoading(user.id)
    try {
      await api.users.setActivo(user.id, !user.activo)
      load()
    } finally {
      setActionLoading(null)
    }
  }

  async function handleEditRol(user) {
    const nuevoRol = window.prompt(`Rol actual: "${user.rol}"\nIngresá el nuevo rol:`, user.rol)
    if (!nuevoRol || nuevoRol === user.rol) return
    setActionLoading(user.id)
    try {
      await api.users.setRol(user.id, nuevoRol)
      load()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(user) {
    if (user.id === currentUser.id) return
    if (!window.confirm(`¿Revocar el acceso de ${user.nombre} ${user.apellido} a este sistema?\n\nSu cuenta y accesos a otros sistemas no se verán afectados.`)) return
    setActionLoading(user.id)
    try {
      await api.users.delete(user.id)
      load()
    } finally {
      setActionLoading(null)
    }
  }

  async function handleResetPassword(user) {
    const newPassword = window.prompt(`Nueva contraseña para ${user.nombre} ${user.apellido} (mínimo 6 caracteres):`)
    if (!newPassword) return
    if (newPassword.length < 6) { alert('La contraseña debe tener al menos 6 caracteres.'); return }
    setActionLoading(user.id)
    try {
      await api.users.resetPassword(user.id, newPassword)
      alert('Contraseña actualizada.')
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const activeCount = users.filter(u => u.activo).length
  const canSubmit = modalState === MODAL_STATE.NEW_PERSONA || modalState === MODAL_STATE.EXISTING

  const modalTitle = {
    [MODAL_STATE.IDLE]: 'Agregar usuario',
    [MODAL_STATE.SEARCHING]: 'Buscando...',
    [MODAL_STATE.NEW_PERSONA]: 'Nueva persona',
    [MODAL_STATE.EXISTING]: 'Dar acceso',
  }

  return (
    <div>
      <div className="page-header">
        <div className="overline">Administración</div>
        <h1>Usuarios</h1>
        <p>Gestioná los accesos al sistema. Los cambios aplican de forma inmediata.</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {[
            { label: 'Usuarios activos', value: activeCount, color: 'var(--success)' },
            { label: 'Total de usuarios', value: users.length, color: 'var(--primary)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ minWidth: '140px' }}>
              <div className="card-body" style={{ padding: '14px 20px' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: '2px' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" onClick={openModal}>+ Agregar usuario</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-container" style={{ height: '200px' }}><div className="spinner" /></div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <h3>Sin usuarios</h3>
            <p>Agregá el primer usuario con el botón de arriba.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Alta</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isMe = u.id === currentUser.id
                  const busy = actionLoading === u.id
                  return (
                    <tr key={u.id} style={{ opacity: u.activo ? 1 : 0.55 }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%',
                            background: 'var(--blue-50)', color: 'var(--blue-600)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '0.8rem', flexShrink: 0,
                          }}>
                            {u.nombre?.substring(0, 1).toUpperCase()}{u.apellido?.substring(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{u.nombre} {u.apellido}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>DNI {u.numero_documento}</div>
                          </div>
                          {isMe && <span style={{ fontSize: '0.7rem', background: 'var(--blue-50)', color: 'var(--blue-600)', padding: '2px 8px', borderRadius: '10px' }}>vos</span>}
                          {u.es_superadmin && <span style={{ fontSize: '0.7rem', background: 'var(--warning-light)', color: 'var(--warning)', padding: '2px 8px', borderRadius: '10px' }}>superadmin</span>}
                        </div>
                      </td>
                      <td style={{ color: 'var(--gray-600)', fontSize: '0.88rem' }}>{u.email || '—'}</td>
                      <td>
                        <span style={{ fontSize: '0.82rem', background: 'var(--gray-100)', padding: '2px 8px', borderRadius: '6px' }}>
                          {u.rol}
                        </span>
                      </td>
                      <td style={{ color: 'var(--gray-600)', fontSize: '0.88rem' }}>{formatDate(u.created_at)}</td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontSize: '0.78rem', fontWeight: 600, padding: '3px 10px', borderRadius: '10px',
                          background: u.activo ? 'var(--success-light)' : 'var(--error-light)',
                          color: u.activo ? 'var(--success)' : 'var(--error)',
                        }}>
                          {u.activo ? '● Activo' : '● Desactivado'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => handleResetPassword(u)} disabled={busy} title="Cambiar contraseña">🔑</button>
                          <button className="btn btn-outline btn-sm" onClick={() => handleEditRol(u)} disabled={busy} title="Editar rol">✏️</button>
                          {!isMe && (
                            <>
                              <button className="btn btn-outline btn-sm" onClick={() => handleToggleActivo(u)} disabled={busy} title={u.activo ? 'Desactivar' : 'Activar'}>
                                {busy ? '...' : u.activo ? '🚫' : '✅'}
                              </button>
                              <button className="btn btn-outline btn-sm" onClick={() => handleDelete(u)} disabled={busy} title="Revocar acceso" style={{ color: 'var(--error)' }}>🗑️</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal agregar usuario */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-container" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2>{modalTitle[modalState]}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{formError}</div>}

                {/* DNI — siempre visible */}
                <div className="form-group">
                  <label>DNI *</label>
                  <input
                    type="text" className="form-control" placeholder="Ingresá el DNI para buscar"
                    value={form.numero_documento}
                    onChange={e => handleDniChange(e.target.value)}
                    autoFocus
                  />
                </div>

                {modalState === MODAL_STATE.SEARCHING && (
                  <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--gray-500)', fontSize: '0.875rem' }}>
                    Buscando...
                  </div>
                )}

                {/* Persona encontrada */}
                {modalState === MODAL_STATE.EXISTING && (
                  <div style={{ background: 'var(--success-light)', padding: '14px 16px', borderRadius: '8px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--success)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Persona encontrada
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--navy-900)' }}>
                      {form.nombre} {form.apellido}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--gray-600)', marginTop: '2px' }}>
                      DNI {form.numero_documento}
                    </div>
                  </div>
                )}

                {/* Persona nueva — campos editables */}
                {modalState === MODAL_STATE.NEW_PERSONA && (
                  <>
                    <div style={{ background: 'var(--warning-light)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', color: 'var(--warning)' }}>
                      No se encontró una persona con ese DNI. Completá los datos para crearla.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label>Nombre *</label>
                        <input type="text" className="form-control" value={form.nombre}
                          onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
                      </div>
                      <div className="form-group">
                        <label>Apellido *</label>
                        <input type="text" className="form-control" value={form.apellido}
                          onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))} required />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Celular</label>
                      <input type="tel" className="form-control" placeholder="Ej: 3534123456"
                        value={form.telefono}
                        onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
                      <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: '4px' }}>
                        Se usará para enviarle la contraseña por WhatsApp
                      </div>
                    </div>
                  </>
                )}

                {/* Rol — visible cuando se puede crear */}
                {canSubmit && (
                  <div className="form-group">
                    <label>Rol en este sistema *</label>
                    <input type="text" className="form-control" placeholder="Ej: admin, operador, supervisor"
                      value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))} required />
                  </div>
                )}
              </div>

              {canSubmit && (
                <div className="modal-footer">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Guardando...' : 'Confirmar acceso'}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabaseEncuestas } from '../../lib/supabaseEncuestas'

const emptyAreaForm = { texto: '' }
const emptySeccionForm = { texto: '', area_id: '' }

export default function AreasConfig() {
  const [areas, setAreas] = useState([])
  const [secciones, setSecciones] = useState([])
  const [loading, setLoading] = useState(true)

  const [areaForm, setAreaForm] = useState(emptyAreaForm)
  const [editingAreaId, setEditingAreaId] = useState(null)
  const [savingArea, setSavingArea] = useState(false)

  const [seccionForm, setSeccionForm] = useState(emptySeccionForm)
  const [editingSeccionId, setEditingSeccionId] = useState(null)
  const [savingSeccion, setSavingSeccion] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: a } = await supabaseEncuestas.from('areas').select('*').order('id')
    const { data: s } = await supabaseEncuestas.from('secciones').select('*').order('id')
    setAreas(a || [])
    setSecciones(s || [])
    setLoading(false)
  }

  // ── ÁREAS ──────────────────────────────────────────────

  async function handleSaveArea() {
    if (!areaForm.texto.trim()) return
    setSavingArea(true)
    if (editingAreaId) {
      await supabaseEncuestas.from('areas')
        .update({ descripcion: areaForm.texto.trim() })
        .eq('id', editingAreaId)
      await supabaseEncuestas.from('audit_log').insert({
        accion: 'editar_area', tabla: 'areas', registro_id: String(editingAreaId),
        detalles: { descripcion: areaForm.texto.trim() }
      })
    } else {
      const { data: nueva } = await supabaseEncuestas.from('areas')
        .insert({ descripcion: areaForm.texto.trim() }).select().single()
      await supabaseEncuestas.from('audit_log').insert({
        accion: 'crear_area', tabla: 'areas', registro_id: String(nueva.id),
        detalles: { descripcion: areaForm.texto.trim() }
      })
    }
    setAreaForm(emptyAreaForm)
    setEditingAreaId(null)
    setSavingArea(false)
    load()
  }

  async function toggleArea(id, current) {
    await supabaseEncuestas.from('areas').update({ activo: !current }).eq('id', id)
    load()
  }

  async function handleDeleteArea(id) {
    const tienesSecciones = secciones.some(s => s.area_id === id)
    if (tienesSecciones) {
      alert('No se puede eliminar un área que tiene secciones. Eliminá primero las secciones.')
      return
    }
    if (!window.confirm('¿Eliminar esta área?')) return
    await supabaseEncuestas.from('areas').delete().eq('id', id)
    await supabaseEncuestas.from('audit_log').insert({
      accion: 'eliminar_area', tabla: 'areas', registro_id: String(id)
    })
    load()
  }

  function startEditArea(area) {
    setEditingAreaId(area.id)
    setAreaForm({ texto: area.descripcion })
  }

  function cancelEditArea() {
    setEditingAreaId(null)
    setAreaForm(emptyAreaForm)
  }

  // ── SECCIONES ──────────────────────────────────────────

  async function handleSaveSeccion() {
    if (!seccionForm.texto.trim() || !seccionForm.area_id) return
    setSavingSeccion(true)
    if (editingSeccionId) {
      await supabaseEncuestas.from('secciones')
        .update({ descripcion: seccionForm.texto.trim(), area_id: parseInt(seccionForm.area_id) })
        .eq('id', editingSeccionId)
      await supabaseEncuestas.from('audit_log').insert({
        accion: 'editar_seccion', tabla: 'secciones', registro_id: String(editingSeccionId),
        detalles: { descripcion: seccionForm.texto.trim(), area_id: seccionForm.area_id }
      })
    } else {
      const { data: nueva } = await supabaseEncuestas.from('secciones')
        .insert({ descripcion: seccionForm.texto.trim(), area_id: parseInt(seccionForm.area_id) })
        .select().single()
      await supabaseEncuestas.from('audit_log').insert({
        accion: 'crear_seccion', tabla: 'secciones', registro_id: String(nueva.id),
        detalles: { descripcion: seccionForm.texto.trim(), area_id: seccionForm.area_id }
      })
    }
    setSeccionForm(emptySeccionForm)
    setEditingSeccionId(null)
    setSavingSeccion(false)
    load()
  }

  async function toggleSeccion(id, current) {
    await supabaseEncuestas.from('secciones').update({ activo: !current }).eq('id', id)
    load()
  }

  async function handleDeleteSeccion(id) {
    if (!window.confirm('¿Eliminar esta sección?')) return
    await supabaseEncuestas.from('secciones').delete().eq('id', id)
    await supabaseEncuestas.from('audit_log').insert({
      accion: 'eliminar_seccion', tabla: 'secciones', registro_id: String(id)
    })
    load()
  }

  function startEditSeccion(sec) {
    setEditingSeccionId(sec.id)
    setSeccionForm({ texto: sec.descripcion, area_id: String(sec.area_id) })
  }

  function cancelEditSeccion() {
    setEditingSeccionId(null)
    setSeccionForm(emptySeccionForm)
  }

  if (loading) return <div className="loading-container"><div className="spinner" /></div>

  const activeAreas = areas.filter(a => a.activo).length
  const activeSecciones = secciones.filter(s => s.activo).length

  return (
    <div>
      <div className="page-header">
        <div className="overline">Administración</div>
        <h1>Áreas y Secciones</h1>
        <p>Gestioná las dependencias municipales y sus subdivisiones. Las secciones dependen de un área.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {[
          { label: 'Áreas activas', value: activeAreas, total: areas.length, color: 'var(--primary)' },
          { label: 'Secciones activas', value: activeSecciones, total: secciones.length, color: 'var(--success)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ flex: '1 1 160px', minWidth: '160px' }}>
            <div className="card-body" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '2px' }}>{s.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '2px' }}>{s.total} en total</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Left: Forms */}
        <div style={{ flex: '0 0 320px' }}>

          {/* Area form */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-body">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy-900)', marginBottom: '16px' }}>
                🏛️ {editingAreaId ? 'Editar Área' : 'Nueva Área'}
              </h3>
              <div className="form-group">
                <label>Nombre del área</label>
                <input
                  className="form-control"
                  placeholder="Ej: Tesorería"
                  value={areaForm.texto}
                  onChange={e => setAreaForm({ texto: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleSaveArea()}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveArea}
                  disabled={savingArea || !areaForm.texto.trim()}
                  style={{ flex: 1 }}
                >
                  {savingArea ? 'Guardando...' : editingAreaId ? 'Actualizar' : 'Agregar Área'}
                </button>
                {editingAreaId && (
                  <button className="btn btn-outline" onClick={cancelEditArea}>Cancelar</button>
                )}
              </div>
            </div>
          </div>

          {/* Seccion form */}
          <div className="card">
            <div className="card-body">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy-900)', marginBottom: '16px' }}>
                📌 {editingSeccionId ? 'Editar Sección' : 'Nueva Sección'}
              </h3>
              <div className="form-group">
                <label>Área a la que pertenece</label>
                <select
                  className="form-control"
                  value={seccionForm.area_id}
                  onChange={e => setSeccionForm({ ...seccionForm, area_id: e.target.value })}
                >
                  <option value="">Seleccioná un área...</option>
                  {areas.filter(a => a.activo).map(a => (
                    <option key={a.id} value={a.id}>{a.descripcion}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Nombre de la sección</label>
                <input
                  className="form-control"
                  placeholder="Ej: Atención al Público"
                  value={seccionForm.texto}
                  onChange={e => setSeccionForm({ ...seccionForm, texto: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleSaveSeccion()}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveSeccion}
                  disabled={savingSeccion || !seccionForm.texto.trim() || !seccionForm.area_id}
                  style={{ flex: 1 }}
                >
                  {savingSeccion ? 'Guardando...' : editingSeccionId ? 'Actualizar' : 'Agregar Sección'}
                </button>
                {editingSeccionId && (
                  <button className="btn btn-outline" onClick={cancelEditSeccion}>Cancelar</button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Hierarchy */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy-900)', marginBottom: '16px' }}>
            Estructura Organizacional
          </h3>

          {areas.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon">🏛️</div>
                <h3>Sin áreas configuradas</h3>
                <p>Agregá la primera área desde el panel izquierdo.</p>
              </div>
            </div>
          ) : (
            areas.map(area => {
              const seccionesDelArea = secciones.filter(s => s.area_id === area.id)
              return (
                <div
                  key={area.id}
                  className="card"
                  style={{ marginBottom: '16px', opacity: area.activo ? 1 : 0.55 }}
                >
                  {/* Area header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 20px',
                    borderBottom: seccionesDelArea.length > 0 ? '1px solid var(--gray-100)' : 'none',
                    background: area.activo ? 'var(--gray-50)' : 'transparent',
                    borderRadius: seccionesDelArea.length > 0 ? 'var(--radius-md) var(--radius-md) 0 0' : 'var(--radius-md)'
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>🏛️</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--navy-900)', fontSize: '0.95rem' }}>
                        {area.descripcion}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: '2px' }}>
                        {seccionesDelArea.length} sección{seccionesDelArea.length !== 1 ? 'es' : ''}
                        {' · '}
                        {seccionesDelArea.filter(s => s.activo).length} activa{seccionesDelArea.filter(s => s.activo).length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => startEditArea(area)}
                        title="Editar"
                      >✏️</button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => toggleArea(area.id, area.activo)}
                        title={area.activo ? 'Desactivar' : 'Activar'}
                      >{area.activo ? '👁️' : '👁️‍🗨️'}</button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleDeleteArea(area.id)}
                        title="Eliminar"
                        style={{ color: 'var(--error)' }}
                      >🗑️</button>
                    </div>
                  </div>

                  {/* Secciones del área */}
                  {seccionesDelArea.length > 0 && (
                    <div>
                      {seccionesDelArea.map((sec, idx) => (
                        <div
                          key={sec.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '10px 20px 10px 36px',
                            borderBottom: idx < seccionesDelArea.length - 1 ? '1px solid var(--gray-100)' : 'none',
                            opacity: sec.activo ? 1 : 0.5,
                          }}
                        >
                          <span style={{ color: 'var(--gray-300)', fontSize: '0.9rem' }}>└</span>
                          <span style={{ fontSize: '0.95rem' }}>📌</span>
                          <span style={{ flex: 1, fontSize: '0.9rem', color: 'var(--navy-800)' }}>
                            {sec.descripcion}
                          </span>
                          {!sec.activo && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', background: 'var(--gray-100)', padding: '2px 8px', borderRadius: '10px' }}>
                              inactiva
                            </span>
                          )}
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => startEditSeccion(sec)}
                              title="Editar"
                            >✏️</button>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => toggleSeccion(sec.id, sec.activo)}
                              title={sec.activo ? 'Desactivar' : 'Activar'}
                            >{sec.activo ? '👁️' : '👁️‍🗨️'}</button>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleDeleteSeccion(sec.id)}
                              title="Eliminar"
                              style={{ color: 'var(--error)' }}
                            >🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {seccionesDelArea.length === 0 && (
                    <div style={{ padding: '12px 20px 12px 36px', fontSize: '0.82rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>
                      Sin secciones — agregá una desde el panel izquierdo
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabaseEncuestas } from '../../lib/supabaseEncuestas'

export default function ManageSurveys() {
  const [preguntas, setPreguntas] = useState([])
  const [config, setConfig] = useState({ activo: true, dias_expiracion: 7 })
  const [form, setForm] = useState({ texto: '', categoria: '' })
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: p } = await supabaseEncuestas
      .from('preguntas').select('*').order('orden').order('created_at')
    setPreguntas(p || [])

    const { data: c } = await supabaseEncuestas
      .from('encuesta_config').select('*').eq('id', 1).single()
    if (c) setConfig(c)
    setLoading(false)
  }

  async function handleSave() {
    if (!form.texto.trim()) return
    setSaving(true)

    if (editingId) {
      await supabaseEncuestas.from('preguntas')
        .update({ texto: form.texto, categoria: form.categoria, updated_at: new Date().toISOString() })
        .eq('id', editingId)

      await supabaseEncuestas.from('audit_log').insert({
        accion: 'editar_pregunta', tabla: 'preguntas', registro_id: String(editingId),
        detalles: { texto: form.texto, categoria: form.categoria }
      })
    } else {
      const orden = preguntas.length + 1
      await supabaseEncuestas.from('preguntas')
        .insert({ texto: form.texto, categoria: form.categoria, orden })

      await supabaseEncuestas.from('audit_log').insert({
        accion: 'crear_pregunta', tabla: 'preguntas',
        detalles: { texto: form.texto, categoria: form.categoria }
      })
    }

    setForm({ texto: '', categoria: '' })
    setEditingId(null)
    setSaving(false)
    load()
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar esta pregunta?')) return
    await supabaseEncuestas.from('preguntas').delete().eq('id', id)
    await supabaseEncuestas.from('audit_log').insert({
      accion: 'eliminar_pregunta', tabla: 'preguntas', registro_id: String(id)
    })
    load()
  }

  async function toggleActive(id, current) {
    await supabaseEncuestas.from('preguntas')
      .update({ activo: !current, updated_at: new Date().toISOString() })
      .eq('id', id)
    load()
  }

  async function updateConfig(field, value) {
    const updated = { ...config, [field]: value, updated_at: new Date().toISOString() }
    await supabaseEncuestas.from('encuesta_config').update(updated).eq('id', 1)
    setConfig(updated)
    await supabaseEncuestas.from('audit_log').insert({
      accion: 'actualizar_config', tabla: 'encuesta_config',
      detalles: { [field]: value }
    })
  }

  function startEdit(p) {
    setEditingId(p.id)
    setForm({ texto: p.texto, categoria: p.categoria || '' })
  }

  const activeCount = preguntas.filter(p => p.activo).length

  if (loading) return <div className="loading-container"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div className="overline">Administración</div>
        <h1>Gestionar Encuestas</h1>
        <p>Configurá las preguntas de las encuestas de satisfacción ciudadana y los parámetros del sistema.</p>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Left: Add/Edit Question */}
        <div style={{ flex: '0 0 360px' }}>
          <div className="card">
            <div className="card-body">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', fontWeight: 700, marginBottom: '20px', color: 'var(--navy-900)' }}>
                ➕ {editingId ? 'Editar Pregunta' : 'Agregar Pregunta'}
              </h3>

              <div className="form-group">
                <label>Texto de la pregunta</label>
                <textarea
                  className="form-control"
                  placeholder="Ej: ¿Qué tan satisfecho estás con la limpieza del parque?"
                  value={form.texto}
                  onChange={e => setForm({ ...form, texto: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Categoría</label>
                <input
                  className="form-control"
                  placeholder="Ej: Espacios Públicos"
                  value={form.categoria}
                  onChange={e => setForm({ ...form, categoria: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Escala de calificación</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ color: 'var(--star-filled)', fontSize: '1.4rem' }}>★ ★ ★ ★ ★</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>5 Estrellas</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving || !form.texto.trim()}
                  style={{ flex: 1 }}
                >
                  {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar Pregunta'}
                </button>
                {editingId && (
                  <button
                    className="btn btn-outline"
                    onClick={() => { setEditingId(null); setForm({ texto: '', categoria: '' }) }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Config card */}
          <div className="config-card" style={{ marginTop: '20px' }}>
            <h3>⚙️ Configuración Global</h3>
            <div className="config-row">
              <span className="config-label">Estado Activo</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={config.activo}
                  onChange={() => updateConfig('activo', !config.activo)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="config-row">
              <span className="config-label">Expiración</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={config.dias_expiracion}
                  onChange={e => updateConfig('dias_expiracion', parseInt(e.target.value) || 7)}
                  style={{ width: '60px', padding: '6px 10px', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', textAlign: 'center', fontWeight: 700 }}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>Días</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Question list */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy-900)' }}>
              Preguntas Actuales
            </h3>
            <span className="active-questions-badge">{activeCount} preguntas activas</span>
          </div>

          <div className="card">
            {preguntas.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>¿Listo para recopilar datos?</h3>
                <p>Usá el panel lateral para agregar nuevas preguntas a tu encuesta cívica.</p>
              </div>
            ) : (
              preguntas.map((p, i) => (
                <div key={p.id} className="question-item" style={{ opacity: p.activo ? 1 : 0.5 }}>
                  <div className="question-number">{String(i + 1).padStart(2, '0')}</div>
                  <div className="question-content">
                    <h4>{p.texto}</h4>
                    <div className="question-meta">
                      <span>★ Escala de {p.max_estrellas} Estrellas</span>
                      {p.categoria && <span>📁 {p.categoria}</span>}
                      <span>Actualizado: {new Date(p.updated_at).toLocaleDateString('es-AR')}</span>
                    </div>
                  </div>
                  <div className="question-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => startEdit(p)}>✏️</button>
                    <button className="btn btn-outline btn-sm" onClick={() => toggleActive(p.id, p.activo)}>
                      {p.activo ? '👁️' : '👁️‍🗨️'}
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => handleDelete(p.id)} style={{ color: 'var(--error)' }}>🗑️</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

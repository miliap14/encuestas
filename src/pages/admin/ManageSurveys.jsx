import { useState, useEffect } from 'react'
import { supabaseEncuestas } from '../../lib/supabaseEncuestas'
import StarRating from '../../components/StarRating'

const TIPO_LABELS = {
  estrellas: { icon: '★', label: 'Estrellas' },
  texto: { icon: '✏️', label: 'Texto libre' },
  multiple: { icon: '☑️', label: 'Selección múltiple' },
}

const emptyForm = { texto: '', categoria: '', tipo: 'estrellas', max_selecciones: 3 }

function PreviewModal({ preguntas, onClose }) {
  const [ratings, setRatings] = useState({})
  const [textAnswers, setTextAnswers] = useState({})
  const [multiAnswers, setMultiAnswers] = useState({})

  useEffect(() => {
    const r = {}, t = {}, m = {}
    preguntas.forEach(p => {
      const tipo = p.tipo || 'estrellas'
      if (tipo === 'estrellas') r[p.id] = 0
      if (tipo === 'texto') t[p.id] = ''
      if (tipo === 'multiple') m[p.id] = []
    })
    setRatings(r)
    setTextAnswers(t)
    setMultiAnswers(m)
  }, [preguntas])

  function toggleMulti(preguntaId, opcionTexto, maxSel) {
    const current = multiAnswers[preguntaId] || []
    if (current.includes(opcionTexto)) {
      setMultiAnswers({ ...multiAnswers, [preguntaId]: current.filter(o => o !== opcionTexto) })
    } else if (current.length < maxSel) {
      setMultiAnswers({ ...multiAnswers, [preguntaId]: [...current, opcionTexto] })
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px'
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--gray-100)', borderRadius: 'var(--radius-lg)',
        width: '100%', maxWidth: '480px', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Modal header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--gray-200)',
          background: 'white'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Vista Previa
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--gray-600)', marginTop: '2px' }}>
              Así verá el vecino la encuesta
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--gray-500)', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Survey content */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ background: 'var(--primary)', padding: '24px 20px', textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
              Justiniano Posse
            </div>
            <div style={{ color: 'white', fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.4 }}>
              Tu opinión nos ayuda a mejorar Justiniano Posse
            </div>
            <div style={{
              display: 'inline-block', marginTop: '12px', background: 'rgba(255,255,255,0.15)',
              color: 'white', fontSize: '0.8rem', padding: '4px 12px', borderRadius: '20px'
            }}>
              🔒 Completamente Anónima
            </div>
          </div>

          <div style={{ padding: '16px' }}>
            {preguntas.filter(p => p.activo).map(p => {
              const tipo = p.tipo || 'estrellas'
              return (
                <div key={p.id} style={{
                  background: 'white', borderRadius: 'var(--radius-md)',
                  padding: '20px', marginBottom: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                }}>
                  {p.categoria && (
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                      {p.categoria}
                    </div>
                  )}
                  <div style={{ fontWeight: 600, color: 'var(--navy-900)', marginBottom: '12px', lineHeight: 1.4 }}>
                    {p.texto}
                  </div>

                  {tipo === 'estrellas' && (
                    <StarRating
                      value={ratings[p.id] || 0}
                      onChange={val => setRatings({ ...ratings, [p.id]: val })}
                      max={p.max_estrellas}
                    />
                  )}

                  {tipo === 'texto' && (
                    <textarea
                      className="form-control"
                      placeholder="Escribí tu respuesta..."
                      value={textAnswers[p.id] || ''}
                      onChange={e => setTextAnswers({ ...textAnswers, [p.id]: e.target.value })}
                      style={{ marginTop: '4px' }}
                    />
                  )}

                  {tipo === 'multiple' && (
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '8px' }}>
                        Seleccioná hasta {p.max_selecciones} opciones
                      </div>
                      {(p.pregunta_opciones || []).sort((a, b) => a.orden - b.orden).map(op => {
                        const selected = (multiAnswers[p.id] || []).includes(op.texto)
                        const maxReached = (multiAnswers[p.id] || []).length >= p.max_selecciones
                        return (
                          <label key={op.id} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '6px 0', cursor: (!selected && maxReached) ? 'not-allowed' : 'pointer',
                            opacity: (!selected && maxReached) ? 0.4 : 1
                          }}>
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled={!selected && maxReached}
                              onChange={() => toggleMulti(p.id, op.texto, p.max_selecciones)}
                            />
                            {op.texto}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Comment field */}
            <div style={{
              background: 'white', borderRadius: 'var(--radius-md)',
              padding: '20px', marginBottom: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Opcional
              </div>
              <div style={{ fontWeight: 600, color: 'var(--navy-900)', marginBottom: '12px' }}>
                ¿Querés dejarnos un comentario?
              </div>
              <textarea className="form-control" placeholder="Escribí acá tu comentario..." readOnly />
            </div>

            <button
              style={{
                width: '100%', padding: '14px', background: 'var(--primary)',
                color: 'white', border: 'none', borderRadius: 'var(--radius-md)',
                fontWeight: 700, fontSize: '1rem', cursor: 'default', marginBottom: '16px'
              }}
            >
              Enviar Opinión ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ManageSurveys() {
  const [preguntas, setPreguntas] = useState([])
  const [config, setConfig] = useState({ activo: true, dias_expiracion: 7, mensaje_whatsapp: '', mensaje_reenvio: '' })
  const [form, setForm] = useState(emptyForm)
  const [opciones, setOpciones] = useState([])
  const [newOpcion, setNewOpcion] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [msgSaving, setMsgSaving] = useState(false)
  const [msgDraft, setMsgDraft] = useState({ mensaje_whatsapp: '', mensaje_reenvio: '' })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: p } = await supabaseEncuestas
      .from('preguntas')
      .select('*, pregunta_opciones(id, texto, orden)')
      .order('orden')
      .order('created_at')
    setPreguntas(p || [])

    const { data: c } = await supabaseEncuestas
      .from('encuesta_config').select('*').eq('id', 1).single()
    if (c) {
      setConfig(c)
      setMsgDraft({ mensaje_whatsapp: c.mensaje_whatsapp ?? '', mensaje_reenvio: c.mensaje_reenvio ?? '' })
    }
    setLoading(false)
  }

  async function moveQuestion(index, direction) {
    const newList = [...preguntas]
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= newList.length) return

    ;[newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]]

    setPreguntas(newList)
    await Promise.all(
      newList.map((p, i) =>
        supabaseEncuestas.from('preguntas').update({ orden: i + 1 }).eq('id', p.id)
      )
    )
  }

  function addOpcion() {
    if (!newOpcion.trim()) return
    setOpciones([...opciones, newOpcion.trim()])
    setNewOpcion('')
  }

  function removeOpcion(i) {
    setOpciones(opciones.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    if (!form.texto.trim()) return
    if (form.tipo === 'multiple' && opciones.length < 2) {
      alert('Agregá al menos 2 opciones para una pregunta de selección múltiple.')
      return
    }
    setSaving(true)

    const payload = {
      texto: form.texto,
      categoria: form.categoria,
      tipo: form.tipo,
      max_selecciones: form.tipo === 'multiple' ? form.max_selecciones : null,
      updated_at: new Date().toISOString(),
    }

    let preguntaId = editingId

    if (editingId) {
      await supabaseEncuestas.from('preguntas').update(payload).eq('id', editingId)
      await supabaseEncuestas.from('audit_log').insert({
        accion: 'editar_pregunta', tabla: 'preguntas', registro_id: String(editingId),
        detalles: payload
      })
    } else {
      const orden = preguntas.length + 1
      const { data: nueva } = await supabaseEncuestas
        .from('preguntas').insert({ ...payload, orden }).select().single()
      preguntaId = nueva.id
      await supabaseEncuestas.from('audit_log').insert({
        accion: 'crear_pregunta', tabla: 'preguntas',
        detalles: payload
      })
    }

    await supabaseEncuestas.from('pregunta_opciones').delete().eq('pregunta_id', preguntaId)
    if (form.tipo === 'multiple' && opciones.length > 0) {
      await supabaseEncuestas.from('pregunta_opciones').insert(
        opciones.map((texto, i) => ({ pregunta_id: preguntaId, texto, orden: i }))
      )
    }

    setForm(emptyForm)
    setOpciones([])
    setNewOpcion('')
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
    setForm({
      texto: p.texto,
      categoria: p.categoria || '',
      tipo: p.tipo || 'estrellas',
      max_selecciones: p.max_selecciones || 3,
    })
    setOpciones(
      (p.pregunta_opciones || []).sort((a, b) => a.orden - b.orden).map(o => o.texto)
    )
    setNewOpcion('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
    setOpciones([])
    setNewOpcion('')
  }

  const activeCount = preguntas.filter(p => p.activo).length

  if (loading) return <div className="loading-container"><div className="spinner" /></div>

  return (
    <div>
      {showPreview && (
        <PreviewModal preguntas={preguntas} onClose={() => setShowPreview(false)} />
      )}

      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="overline">Administración</div>
            <h1>Gestionar Encuestas</h1>
            <p>Configurá las preguntas de las encuestas de satisfacción ciudadana y los parámetros del sistema.</p>
          </div>
          <button
            className="btn btn-outline"
            onClick={() => setShowPreview(true)}
            style={{ marginTop: '8px', whiteSpace: 'nowrap' }}
          >
            👁️ Vista Previa
          </button>
        </div>
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
                <label>Tipo de pregunta</label>
                <select
                  className="form-control"
                  value={form.tipo}
                  onChange={e => setForm({ ...form, tipo: e.target.value })}
                >
                  <option value="estrellas">★ Calificación con estrellas</option>
                  <option value="texto">✏️ Respuesta de texto libre</option>
                  <option value="multiple">☑️ Selección múltiple</option>
                </select>
              </div>

              <div className="form-group">
                <label>Texto de la pregunta</label>
                <textarea
                  className="form-control"
                  placeholder={
                    form.tipo === 'estrellas' ? 'Ej: ¿Qué tan satisfecho estás con la atención recibida?' :
                    form.tipo === 'texto' ? 'Ej: En caso de no haber sido atendida tu solicitud, dejanos tu comentario' :
                    'Ej: ¿En qué servicios deberíamos mejorar?'
                  }
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

              {form.tipo === 'estrellas' && (
                <div className="form-group">
                  <label>Escala de calificación</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span style={{ color: 'var(--star-filled)', fontSize: '1.4rem' }}>★ ★ ★ ★ ★</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>5 Estrellas</span>
                  </div>
                </div>
              )}

              {form.tipo === 'multiple' && (
                <>
                  <div className="form-group">
                    <label>Máximo de opciones seleccionables</label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      max="10"
                      value={form.max_selecciones}
                      onChange={e => setForm({ ...form, max_selecciones: parseInt(e.target.value) || 1 })}
                      style={{ width: '80px' }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Opciones</label>
                    {opciones.map((op, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ flex: 1, fontSize: '0.9rem', padding: '6px 10px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-200)' }}>
                          {op}
                        </span>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => removeOpcion(i)}
                          style={{ color: 'var(--error)', padding: '4px 8px' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <input
                        className="form-control"
                        placeholder="Nueva opción..."
                        value={newOpcion}
                        onChange={e => setNewOpcion(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOpcion())}
                      />
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={addOpcion}
                        disabled={!newOpcion.trim()}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </>
              )}

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
                  <button className="btn btn-outline" onClick={cancelEdit}>
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

          {/* Mensajes WhatsApp */}
          <div className="card" style={{ marginTop: '20px' }}>
            <div className="card-body">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px', color: 'var(--navy-900)' }}>
                💬 Mensajes de WhatsApp
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginBottom: '16px', lineHeight: 1.5 }}>
                Variables disponibles: <code style={{ background: 'var(--gray-100)', padding: '1px 6px', borderRadius: '4px' }}>{'{nombre}'}</code> <code style={{ background: 'var(--gray-100)', padding: '1px 6px', borderRadius: '4px' }}>{'{link}'}</code> <code style={{ background: 'var(--gray-100)', padding: '1px 6px', borderRadius: '4px' }}>{'{dias}'}</code>
              </p>

              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Mensaje inicial</label>
                <p style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginBottom: '6px' }}>
                  Se envía cuando se registra la visita del vecino.
                </p>
                <textarea
                  className="form-control"
                  rows={8}
                  value={msgDraft.mensaje_whatsapp}
                  onChange={e => setMsgDraft({ ...msgDraft, mensaje_whatsapp: e.target.value })}
                  style={{ fontSize: '0.88rem', lineHeight: 1.5 }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Mensaje de reenvío</label>
                <p style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginBottom: '6px' }}>
                  Se envía como recordatorio si el vecino no completó la encuesta.
                </p>
                <textarea
                  className="form-control"
                  rows={8}
                  value={msgDraft.mensaje_reenvio}
                  onChange={e => setMsgDraft({ ...msgDraft, mensaje_reenvio: e.target.value })}
                  style={{ fontSize: '0.88rem', lineHeight: 1.5 }}
                />
              </div>

              <button
                className="btn btn-primary"
                disabled={msgSaving || (msgDraft.mensaje_whatsapp === (config.mensaje_whatsapp ?? '') && msgDraft.mensaje_reenvio === (config.mensaje_reenvio ?? ''))}
                onClick={async () => {
                  setMsgSaving(true)
                  await supabaseEncuestas.from('encuesta_config').update({
                    mensaje_whatsapp: msgDraft.mensaje_whatsapp,
                    mensaje_reenvio: msgDraft.mensaje_reenvio,
                    updated_at: new Date().toISOString(),
                  }).eq('id', 1)
                  setConfig(c => ({ ...c, mensaje_whatsapp: msgDraft.mensaje_whatsapp, mensaje_reenvio: msgDraft.mensaje_reenvio }))
                  await supabaseEncuestas.from('audit_log').insert({
                    accion: 'actualizar_mensajes', tabla: 'encuesta_config',
                    detalles: { mensaje_whatsapp: 'actualizado', mensaje_reenvio: 'actualizado' },
                  })
                  setMsgSaving(false)
                }}
                style={{ width: '100%' }}
              >
                {msgSaving ? 'Guardando...' : 'Guardar mensajes'}
              </button>
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
              preguntas.map((p, i) => {
                const tipo = p.tipo || 'estrellas'
                const tipoInfo = TIPO_LABELS[tipo]
                return (
                  <div key={p.id} className="question-item" style={{ opacity: p.activo ? 1 : 0.5 }}>
                    {/* Order buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '4px' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => moveQuestion(i, -1)}
                        disabled={i === 0}
                        style={{ padding: '2px 6px', fontSize: '0.75rem', opacity: i === 0 ? 0.2 : 1 }}
                      >
                        ▲
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => moveQuestion(i, 1)}
                        disabled={i === preguntas.length - 1}
                        style={{ padding: '2px 6px', fontSize: '0.75rem', opacity: i === preguntas.length - 1 ? 0.2 : 1 }}
                      >
                        ▼
                      </button>
                    </div>

                    <div className="question-number">{String(i + 1).padStart(2, '0')}</div>
                    <div className="question-content">
                      <h4>{p.texto}</h4>
                      <div className="question-meta">
                        <span>{tipoInfo.icon} {tipoInfo.label}
                          {tipo === 'estrellas' && ` · ${p.max_estrellas} estrellas`}
                          {tipo === 'multiple' && ` · hasta ${p.max_selecciones} opciones`}
                        </span>
                        {tipo === 'multiple' && p.pregunta_opciones?.length > 0 && (
                          <span>{p.pregunta_opciones.length} opción{p.pregunta_opciones.length !== 1 ? 'es' : ''}</span>
                        )}
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
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

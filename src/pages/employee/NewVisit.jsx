import { useState, useEffect } from 'react'
import { supabaseEncuestas } from '../../lib/supabaseEncuestas'
import { supabasePersonas } from '../../lib/supabasePersonas'
import { evolutionApi } from '../../lib/evolutionApi'

export default function NewVisit() {
  const [dni, setDni] = useState('')
  const [persona, setPersona] = useState(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [areas, setAreas] = useState([])
  const [secciones, setSecciones] = useState([])
  const [form, setForm] = useState({ area_id: '', seccion_id: '', motivo: '', prioridad: 'normal' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null) // { token, telefono }

  const [config, setConfig] = useState({ dias_expiracion: 7, mensaje_whatsapp: '' })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: a } = await supabaseEncuestas.from('areas').select('*').order('id')
    setAreas(a || [])
    const { data: s } = await supabaseEncuestas.from('secciones').select('*').order('id')
    setSecciones(s || [])
    const { data: c } = await supabaseEncuestas.from('encuesta_config').select('*').eq('id', 1).single()
    if (c) setConfig(c)
  }

  async function searchPersona() {
    if (!dni.trim()) return
    setSearching(true)
    setSearchError('')
    setPersona(null)

    try {
      const { data, error } = await supabasePersonas
        .from('personas')
        .select('id, nombre, apellido, numero_documento, telefono, email, direccion')
        .eq('numero_documento', dni.trim())
        .single()

      if (error || !data) {
        setSearchError('Persona no encontrada con ese DNI')
      } else {
        setPersona(data)
      }
    } catch (err) {
      setSearchError('Error al buscar persona')
    }
    setSearching(false)
  }

  const filteredSecciones = form.area_id
    ? secciones.filter(s => s.area_id === parseInt(form.area_id))
    : secciones

  async function handleSubmit(sendSurvey) {
    if (!persona || !form.area_id) return
    setSubmitting(true)

    try {
      const token = crypto.randomUUID()
      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin
      const surveyLink = `${appUrl}/encuesta/${token}`

      const { data: visita, error } = await supabaseEncuestas.from('visitas').insert({
        persona_id: persona.id,
        area_id: parseInt(form.area_id),
        seccion_id: form.seccion_id ? parseInt(form.seccion_id) : null,
        motivo: form.motivo,
        prioridad: form.prioridad,
        encuesta_token: token,
        encuesta_enviada: sendSurvey && !!persona.telefono,
        telefono_envio: persona.telefono
      }).select().single()

      await supabaseEncuestas.from('audit_log').insert({
        accion: 'crear_visita', tabla: 'visitas', registro_id: String(visita.id),
        detalles: { persona_id: persona.id, area_id: form.area_id, seccion_id: form.seccion_id }
      })

      // Send WhatsApp if requested
      if (sendSurvey && persona.telefono) {
        let msg = config.mensaje_whatsapp || '🏛️ *Municipalidad de Justiniano Posse*\n\nGracias por visitarnos.\n\nCompletá la encuesta: {link}\n\nTenés {dias} días para responder.'
        msg = msg.replace('{link}', surveyLink).replace('{dias}', config.dias_expiracion)

        try {
          // Format phone: ensure starts with country code
          let phone = persona.telefono.replace(/[^0-9]/g, '')
          if (phone.startsWith('0')) phone = '54' + phone.substring(1)
          if (!phone.startsWith('54')) phone = '54' + phone

          await evolutionApi.sendText(phone, msg)

          await supabaseEncuestas.from('audit_log').insert({
            accion: 'enviar_encuesta', tabla: 'visitas', registro_id: String(visita.id),
            detalles: { telefono: persona.telefono, token }
          })
        } catch (err) {
          console.error('Error sending WhatsApp:', err)
        }
      }

      setSubmitted({ token, surveyLink, telefono: persona.telefono })
    } catch (err) {
      console.error('Error creating visit:', err)
      alert('Error al registrar la visita')
    }

    setSubmitting(false)
  }

  function resetForm() {
    setDni('')
    setPersona(null)
    setSearchError('')
    setForm({ area_id: '', seccion_id: '', motivo: '', prioridad: 'normal' })
    setSubmitted(null)
  }

  if (submitted) {
    return (
      <div>
        <div className="page-header">
          <h1>✅ Visita Registrada</h1>
          <p>La visita fue registrada correctamente.</p>
        </div>

        <div className="card" style={{ maxWidth: '600px' }}>
          <div className="card-body">
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
              <h2 style={{ color: 'var(--navy-900)', marginBottom: '8px' }}>Visita registrada con éxito</h2>

              {submitted.telefono && (
                <p style={{ color: 'var(--success)', marginBottom: '16px', fontWeight: 600 }}>
                  📱 Encuesta enviada por WhatsApp a {submitted.telefono}
                </p>
              )}

              <div style={{ background: 'var(--gray-50)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: '6px' }}>Link de encuesta:</p>
                <a href={submitted.surveyLink} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all', fontSize: '0.9rem' }}>
                  {submitted.surveyLink}
                </a>
              </div>

              <button className="btn btn-primary" onClick={resetForm}>
                + Registrar otra visita
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1>Registro de Visita Ciudadana</h1>
        <p>Registrá nuevas interacciones y enviá encuestas de satisfacción por WhatsApp.</p>
      </div>

      <div className="visit-form-grid">
        {/* Search panel */}
        <div>
          <div className="card">
            <div className="card-body">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', fontWeight: 700, marginBottom: '20px', color: 'var(--navy-900)' }}>
                👤 Buscar Ciudadano
              </h3>

              <div className="form-group">
                <label>DNI / Nro. Documento</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="form-control"
                    placeholder="Ej: 20455122"
                    value={dni}
                    onChange={e => setDni(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchPersona()}
                  />
                  <button className="btn btn-primary" onClick={searchPersona} disabled={searching}>
                    {searching ? '...' : '🔍'}
                  </button>
                </div>
              </div>

              {searchError && (
                <div style={{ color: 'var(--error)', fontSize: '0.85rem', marginTop: '8px' }}>
                  ❌ {searchError}
                </div>
              )}

              {persona && (
                <>
                  <div className="person-info">
                    <h4>{persona.apellido}, {persona.nombre}</h4>
                    <p>DNI: {persona.numero_documento}</p>
                    {persona.telefono && <p>📱 {persona.telefono}</p>}
                    {persona.email && <p>📧 {persona.email}</p>}
                    {persona.direccion && <p>📍 {persona.direccion}</p>}
                  </div>
                  <div className="verified-badge" style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 600 }}>
                    ✅ Identidad verificada
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Visit details */}
        <div>
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy-900)' }}>
                  📋 Detalles de Visita
                </h3>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Área</label>
                  <select
                    className="form-control"
                    value={form.area_id}
                    onChange={e => setForm({ ...form, area_id: e.target.value, seccion_id: '' })}
                  >
                    <option value="">Seleccionar área...</option>
                    {areas.map(a => <option key={a.id} value={a.id}>{a.descripcion}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Sección</label>
                  <select
                    className="form-control"
                    value={form.seccion_id}
                    onChange={e => setForm({ ...form, seccion_id: e.target.value })}
                    disabled={!form.area_id}
                  >
                    <option value="">Seleccionar sección...</option>
                    {filteredSecciones.map(s => <option key={s.id} value={s.id}>{s.descripcion}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Nivel de Prioridad</label>
                <div className="priority-toggle">
                  <button
                    className={form.prioridad === 'normal' ? 'active' : ''}
                    onClick={() => setForm({ ...form, prioridad: 'normal' })}
                  >
                    Normal
                  </button>
                  <button
                    className={`urgente ${form.prioridad === 'urgente' ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, prioridad: 'urgente' })}
                  >
                    Urgente
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Motivo o Notas</label>
                <textarea
                  className="form-control"
                  placeholder="Describí brevemente el motivo de la visita..."
                  value={form.motivo}
                  onChange={e => setForm({ ...form, motivo: e.target.value })}
                />
              </div>
            </div>

            <div className="visit-phone-bar">
              <div className="phone-info">
                {persona?.telefono ? (
                  <>📱 Teléfono del ciudadano: {persona.telefono}</>
                ) : (
                  persona ? '⚠️ Sin teléfono registrado' : 'Buscá un ciudadano primero'
                )}
              </div>
              <div className="visit-actions">
                <button className="btn btn-outline" onClick={resetForm}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => handleSubmit(true)}
                  disabled={!persona || !form.area_id || submitting}
                >
                  {submitting ? 'Registrando...' : 'Registrar y Enviar Encuesta ➤'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

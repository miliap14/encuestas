import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabaseEncuestas } from '../../lib/supabaseEncuestas'
import StarRating from '../../components/StarRating'

export default function SurveyForm() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [preguntas, setPreguntas] = useState([])
  const [ratings, setRatings] = useState({})
  const [textAnswers, setTextAnswers] = useState({})
  const [multiAnswers, setMultiAnswers] = useState({})
  const [comentario, setComentario] = useState('')
  const [visita, setVisita] = useState(null)
  const [config, setConfig] = useState(null)
  const [expired, setExpired] = useState(false)
  const [alreadyAnswered, setAlreadyAnswered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    loadSurvey()
  }, [token])

  async function loadSurvey() {
    try {
      const { data: v, error: vErr } = await supabaseEncuestas
        .from('visitas')
        .select('*')
        .eq('encuesta_token', token)
        .single()

      if (vErr || !v) {
        setExpired(true)
        setLoading(false)
        return
      }
      setVisita(v)

      const { data: existing } = await supabaseEncuestas
        .from('respuestas')
        .select('id')
        .eq('token', token)
        .limit(1)

      if (existing && existing.length > 0) {
        setAlreadyAnswered(true)
        setLoading(false)
        return
      }

      const { data: conf } = await supabaseEncuestas
        .from('encuesta_config')
        .select('*')
        .eq('id', 1)
        .single()
      setConfig(conf)

      if (conf) {
        const createdAt = new Date(v.created_at)
        const expiresAt = new Date(createdAt.getTime() + conf.dias_expiracion * 24 * 60 * 60 * 1000)
        const now = new Date()

        if (now > expiresAt) {
          setExpired(true)
          setLoading(false)
          return
        }

        const diff = expiresAt - now
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        setTimeLeft(days > 0 ? `${days} día${days > 1 ? 's' : ''} y ${hours}h` : `${hours} horas`)
      }

      if (conf && !conf.activo) {
        setExpired(true)
        setLoading(false)
        return
      }

      const { data: preg } = await supabaseEncuestas
        .from('preguntas')
        .select('*, pregunta_opciones(id, texto, orden)')
        .eq('activo', true)
        .order('orden')

      setPreguntas(preg || [])

      const initRatings = {}
      const initText = {}
      const initMulti = {}
      preg?.forEach(p => {
        const tipo = p.tipo || 'estrellas'
        if (tipo === 'estrellas') initRatings[p.id] = 0
        if (tipo === 'texto') initText[p.id] = ''
        if (tipo === 'multiple') initMulti[p.id] = []
      })
      setRatings(initRatings)
      setTextAnswers(initText)
      setMultiAnswers(initMulti)

    } catch (err) {
      console.error('Error loading survey:', err)
      setExpired(true)
    }
    setLoading(false)
  }

  function toggleMultiOption(preguntaId, opcionTexto, maxSel) {
    const current = multiAnswers[preguntaId] || []
    if (current.includes(opcionTexto)) {
      setMultiAnswers({ ...multiAnswers, [preguntaId]: current.filter(o => o !== opcionTexto) })
    } else if (current.length < maxSel) {
      setMultiAnswers({ ...multiAnswers, [preguntaId]: [...current, opcionTexto] })
    }
  }

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)

    try {
      // Usamos una RPC o insertamos todo junto para evitar necesitar SELECT
      // Primero insertamos la respuesta sin .select() (anónimo no puede leer)
      const { error } = await supabaseEncuestas
        .from('respuestas')
        .insert({
          visita_id: visita.id,
          token,
          comentario: comentario.trim() || null
        })

      if (error) throw error

      // Obtener el ID de la respuesta recién creada vía la visita
      // (respuesta_detalles permite INSERT anónimo, usamos visita_id como referencia)
      const { data: respRow } = await supabaseEncuestas
        .from('respuestas')
        .select('id')
        .eq('token', token)
        .limit(1)
        .maybeSingle()

      if (respRow) {
        const detalles = preguntas.flatMap(p => {
          const tipo = p.tipo || 'estrellas'
          if (tipo === 'estrellas' && (ratings[p.id] || 0) > 0) {
            return [{ respuesta_id: respRow.id, pregunta_id: p.id, calificacion: ratings[p.id] }]
          }
          if (tipo === 'texto' && textAnswers[p.id]?.trim()) {
            return [{ respuesta_id: respRow.id, pregunta_id: p.id, respuesta_texto: textAnswers[p.id].trim() }]
          }
          if (tipo === 'multiple' && (multiAnswers[p.id] || []).length > 0) {
            return [{ respuesta_id: respRow.id, pregunta_id: p.id, opciones_seleccionadas: multiAnswers[p.id] }]
          }
          return []
        })

        if (detalles.length > 0) {
          await supabaseEncuestas.from('respuesta_detalles').insert(detalles)
        }
      }

      navigate('/encuesta/gracias')
    } catch (err) {
      console.error('Error submitting survey:', err)
      alert('Error al enviar la encuesta. Intentá de nuevo.')
    }

    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (alreadyAnswered) {
    return (
      <div className="survey-expired">
        <div className="expired-icon">✅</div>
        <h1>Encuesta ya respondida</h1>
        <p>Ya recibimos tu opinión. ¡Gracias por participar!</p>
      </div>
    )
  }

  if (expired) {
    return (
      <div className="survey-expired">
        <div className="expired-icon">⏰</div>
        <h1>Encuesta Expirada</h1>
        <p>El tiempo para completar esta encuesta se ha agotado. Gracias por tu interés en participar.</p>
      </div>
    )
  }

  const hasAnyAnswer = preguntas.some(p => {
    const tipo = p.tipo || 'estrellas'
    if (tipo === 'estrellas') return (ratings[p.id] || 0) > 0
    if (tipo === 'texto') return !!textAnswers[p.id]?.trim()
    if (tipo === 'multiple') return (multiAnswers[p.id] || []).length > 0
    return false
  })

  return (
    <div className="survey-layout">
      <div className="survey-header">
        <div className="survey-brand">
          <h3>Justiniano Posse</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>🔔</span>
            <span style={{ fontSize: '1.1rem' }}>👤</span>
          </div>
        </div>
        <h1>Tu opinión nos ayuda a mejorar Justiniano Posse</h1>
        <div className="anonymous-badge">
          🔒 Completamente Anónima
        </div>
      </div>

      <div className="survey-body">
        {preguntas.map(p => {
          const tipo = p.tipo || 'estrellas'
          return (
            <div key={p.id} className="survey-question-card">
              {p.categoria && <div className="question-category">{p.categoria}</div>}
              <div className="question-text">{p.texto}</div>

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
                  style={{ marginTop: '8px' }}
                />
              )}

              {tipo === 'multiple' && (
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: '12px' }}>
                    Seleccioná hasta {p.max_selecciones} opciones
                    {(multiAnswers[p.id] || []).length > 0 &&
                      ` · ${(multiAnswers[p.id] || []).length} elegida${(multiAnswers[p.id] || []).length > 1 ? 's' : ''}`
                    }
                  </div>
                  {(p.pregunta_opciones || [])
                    .sort((a, b) => a.orden - b.orden)
                    .map(op => {
                      const selected = (multiAnswers[p.id] || []).includes(op.texto)
                      const maxReached = (multiAnswers[p.id] || []).length >= p.max_selecciones
                      const disabled = !selected && maxReached
                      return (
                        <div
                          key={op.id}
                          className={`survey-option ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                          onClick={() => !disabled && toggleMultiOption(p.id, op.texto, p.max_selecciones)}
                        >
                          <div className="survey-option-check">
                            {selected && '✓'}
                          </div>
                          {op.texto}
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )
        })}

        <div className="survey-question-card">
          <div className="question-category">Opcional</div>
          <div className="question-text">¿Querés dejarnos un comentario?</div>
          <textarea
            className="form-control"
            placeholder="Escribí acá tu comentario..."
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            style={{ marginTop: '8px' }}
          />
        </div>

        {timeLeft && (
          <div className="survey-expiry-warning">
            ⏱️ Esta encuesta expira en {timeLeft}
          </div>
        )}

        <button
          className="survey-submit-btn"
          onClick={handleSubmit}
          disabled={submitting || !hasAnyAnswer}
        >
          {submitting ? 'Enviando...' : 'Enviar Opinión ➤'}
        </button>

        <div className="survey-footer">
          Justiniano Posse Civic Portal
        </div>
      </div>
    </div>
  )
}

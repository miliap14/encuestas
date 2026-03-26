import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabaseEncuestas } from '../../lib/supabaseEncuestas'
import StarRating from '../../components/StarRating'

export default function SurveyForm() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [preguntas, setPreguntas] = useState([])
  const [ratings, setRatings] = useState({})
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
      // Check if token is valid
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

      // Check already answered
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

      // Get config for expiration
      const { data: conf } = await supabaseEncuestas
        .from('encuesta_config')
        .select('*')
        .eq('id', 1)
        .single()
      setConfig(conf)

      // Check expiration
      if (conf) {
        const createdAt = new Date(v.created_at)
        const expiresAt = new Date(createdAt.getTime() + conf.dias_expiracion * 24 * 60 * 60 * 1000)
        const now = new Date()

        if (now > expiresAt) {
          setExpired(true)
          setLoading(false)
          return
        }

        // Calculate time left
        const diff = expiresAt - now
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        setTimeLeft(days > 0 ? `${days} día${days > 1 ? 's' : ''} y ${hours}h` : `${hours} horas`)
      }

      // Check if surveys are active
      if (conf && !conf.activo) {
        setExpired(true)
        setLoading(false)
        return
      }

      // Load active questions
      const { data: preg } = await supabaseEncuestas
        .from('preguntas')
        .select('*')
        .eq('activo', true)
        .order('orden')

      setPreguntas(preg || [])

      // Init ratings
      const initRatings = {}
      preg?.forEach(p => { initRatings[p.id] = 0 })
      setRatings(initRatings)

    } catch (err) {
      console.error('Error loading survey:', err)
      setExpired(true)
    }
    setLoading(false)
  }

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)

    try {
      // Create response
      const { data: resp, error } = await supabaseEncuestas
        .from('respuestas')
        .insert({
          visita_id: visita.id,
          token,
          comentario: comentario.trim() || null
        })
        .select()
        .single()

      if (error) throw error

      // Create rating details
      const detalles = Object.entries(ratings)
        .filter(([, cal]) => cal > 0)
        .map(([pregunta_id, calificacion]) => ({
          respuesta_id: resp.id,
          pregunta_id: parseInt(pregunta_id),
          calificacion
        }))

      if (detalles.length > 0) {
        await supabaseEncuestas.from('respuesta_detalles').insert(detalles)
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

  const answeredCount = Object.values(ratings).filter(r => r > 0).length

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
        {preguntas.map(p => (
          <div key={p.id} className="survey-question-card">
            {p.categoria && (
              <div className="question-category">{p.categoria}</div>
            )}
            <div className="question-text">{p.texto}</div>
            <StarRating
              value={ratings[p.id] || 0}
              onChange={val => setRatings({ ...ratings, [p.id]: val })}
              max={p.max_estrellas}
            />
          </div>
        ))}

        {/* Optional comment */}
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
          disabled={submitting || answeredCount === 0}
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

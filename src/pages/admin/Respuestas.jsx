import { useState, useEffect } from 'react'
import { supabaseEncuestas } from '../../lib/supabaseEncuestas'
import { api } from '../../lib/api'

const PAGE_SIZE = 20

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function EstadoBadge({ estado }) {
  const styles = {
    respondida: { bg: 'var(--success-light)', color: 'var(--success)', label: 'Respondida' },
    pendiente: { bg: 'var(--warning-light)', color: 'var(--warning)', label: 'Pendiente' },
    expirada: { bg: 'var(--error-light)', color: 'var(--error)', label: 'Expirada' },
  }
  const s = styles[estado] ?? styles.pendiente
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '0.78rem', fontWeight: 600, padding: '3px 10px', borderRadius: '10px',
      background: s.bg, color: s.color,
    }}>
      ● {s.label}
    </span>
  )
}

export default function Respuestas() {
  const [rows, setRows] = useState([])
  const [personas, setPersonas] = useState({})
  const [preguntas, setPreguntas] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroArea, setFiltroArea] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [config, setConfig] = useState(null)

  useEffect(() => {
    loadInit()
  }, [])

  useEffect(() => {
    loadData()
  }, [page, filtroEstado, filtroArea])

  async function loadInit() {
    const [{ data: p }, { data: a }, { data: c }] = await Promise.all([
      supabaseEncuestas.from('preguntas').select('id, texto, tipo, categoria').order('orden'),
      supabaseEncuestas.from('areas').select('id, descripcion').order('descripcion'),
      supabaseEncuestas.from('encuesta_config').select('dias_expiracion').eq('id', 1).single(),
    ])
    setPreguntas(p ?? [])
    setAreas(a ?? [])
    setConfig(c)
  }

  async function loadData() {
    setLoading(true)

    // Traer visitas con sus respuestas y detalles
    let query = supabaseEncuestas
      .from('visitas')
      .select(`
        id, persona_id, area_id, encuesta_token, encuesta_enviada, created_at,
        area:areas(descripcion),
        respuesta:respuestas(id, comentario, estado, created_at,
          detalles:respuesta_detalles(pregunta_id, calificacion, respuesta_texto, opciones_seleccionadas)
        )
      `)
      .not('encuesta_token', 'is', null)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (filtroArea) query = query.eq('area_id', filtroArea)

    const { data: visitas } = await query
    if (!visitas) { setRows([]); setLoading(false); return }

    // Calcular estado de cada visita
    const diasExp = config?.dias_expiracion ?? 7
    const now = new Date()

    const processed = visitas.map(v => {
      const resp = v.respuesta?.[0]
      let estado = 'pendiente'
      if (resp) {
        estado = 'respondida'
      } else {
        const expires = new Date(new Date(v.created_at).getTime() + diasExp * 86400000)
        if (now > expires) estado = 'expirada'
      }
      return { ...v, resp, estado }
    })

    // Filtrar por estado si aplica
    const filtered = filtroEstado
      ? processed.filter(r => r.estado === filtroEstado)
      : processed

    setRows(filtered)

    // Resolver nombres de personas
    const personaIds = [...new Set(filtered.map(r => r.persona_id))]
    if (personaIds.length > 0) {
      try {
        const { data } = await api.personas.bulkNames(personaIds)
        setPersonas(prev => ({ ...prev, ...data }))
      } catch { /* silencioso */ }
    }

    setLoading(false)
  }

  function toggleExpand(id) {
    setExpandedId(prev => prev === id ? null : id)
  }

  const stats = {
    total: rows.length,
    respondidas: rows.filter(r => r.estado === 'respondida').length,
    pendientes: rows.filter(r => r.estado === 'pendiente').length,
    expiradas: rows.filter(r => r.estado === 'expirada').length,
  }

  return (
    <div>
      <div className="page-header">
        <div className="overline">Resultados</div>
        <h1>Respuestas de Encuestas</h1>
        <p>Detalle individual de cada encuesta enviada y sus respuestas.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { label: 'Respondidas', value: stats.respondidas, color: 'var(--success)' },
          { label: 'Pendientes', value: stats.pendientes, color: 'var(--warning)' },
          { label: 'Expiradas', value: stats.expiradas, color: 'var(--error)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ minWidth: '130px' }}>
            <div className="card-body" style={{ padding: '14px 20px' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: '2px' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="filter-bar">
        <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPage(0) }}>
          <option value="">Todos los estados</option>
          <option value="respondida">Respondidas</option>
          <option value="pendiente">Pendientes</option>
          <option value="expirada">Expiradas</option>
        </select>
        <select value={filtroArea} onChange={e => { setFiltroArea(e.target.value); setPage(0) }}>
          <option value="">Todas las áreas</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.descripcion}</option>)}
        </select>
        {(filtroEstado || filtroArea) && (
          <button className="btn btn-outline btn-sm" onClick={() => { setFiltroEstado(''); setFiltroArea(''); setPage(0) }}>
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="card">
        {loading ? (
          <div className="loading-container" style={{ height: '200px' }}><div className="spinner" /></div>
        ) : rows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>Sin encuestas</h3>
            <p>Las encuestas enviadas aparecerán aquí.</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Vecino</th>
                    <th>Área</th>
                    <th>Estado</th>
                    <th>Fecha visita</th>
                    <th>Fecha respuesta</th>
                    <th>Comentario</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const p = personas[r.persona_id]
                    const isExpanded = expandedId === r.id
                    return (
                      <>
                        <tr
                          key={r.id}
                          onClick={() => r.resp && toggleExpand(r.id)}
                          style={{ cursor: r.resp ? 'pointer' : 'default' }}
                        >
                          <td style={{ width: '30px', textAlign: 'center', color: 'var(--gray-400)' }}>
                            {r.resp ? (isExpanded ? '▼' : '▶') : ''}
                          </td>
                          <td>
                            <div style={{ fontWeight: 500 }}>
                              {p ? `${p.nombre} ${p.apellido}` : `Persona #${r.persona_id}`}
                            </div>
                            {p && <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>DNI {p.numero_documento}</div>}
                          </td>
                          <td>{r.area?.descripcion ?? '—'}</td>
                          <td><EstadoBadge estado={r.estado} /></td>
                          <td style={{ fontSize: '0.88rem', color: 'var(--gray-600)' }}>{formatDate(r.created_at)}</td>
                          <td style={{ fontSize: '0.88rem', color: 'var(--gray-600)' }}>
                            {r.resp ? formatDate(r.resp.created_at) : '—'}
                          </td>
                          <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.88rem' }}>
                            {r.resp?.comentario ? `"${r.resp.comentario}"` : '—'}
                          </td>
                        </tr>

                        {/* Fila expandida con detalles */}
                        {isExpanded && r.resp && (
                          <tr key={`${r.id}-detail`}>
                            <td colSpan={7} style={{ padding: 0, background: 'var(--gray-50)' }}>
                              <div style={{ padding: '16px 24px 16px 50px' }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy-900)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  Detalle de respuestas
                                </div>
                                <div style={{ display: 'grid', gap: '10px' }}>
                                  {preguntas.map(preg => {
                                    const detalle = r.resp.detalles?.find(d => d.pregunta_id === preg.id)
                                    if (!detalle) return null

                                    let valor = '—'
                                    if (detalle.calificacion != null) {
                                      valor = '★'.repeat(detalle.calificacion) + '☆'.repeat(5 - detalle.calificacion)
                                    } else if (detalle.respuesta_texto) {
                                      valor = `"${detalle.respuesta_texto}"`
                                    } else if (detalle.opciones_seleccionadas) {
                                      const opts = Array.isArray(detalle.opciones_seleccionadas)
                                        ? detalle.opciones_seleccionadas
                                        : []
                                      valor = opts.join(', ')
                                    }

                                    return (
                                      <div key={preg.id} style={{
                                        display: 'flex', gap: '12px', alignItems: 'baseline',
                                        padding: '8px 12px', background: 'var(--white)', borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--gray-200)',
                                      }}>
                                        <div style={{ flex: 1, fontSize: '0.88rem', color: 'var(--gray-700)' }}>
                                          {preg.texto}
                                        </div>
                                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--navy-900)', whiteSpace: 'nowrap' }}>
                                          {valor}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px', gap: '8px' }}>
              <button className="btn btn-outline btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                ← Anterior
              </button>
              <span style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                Página {page + 1}
              </span>
              <button className="btn btn-outline btn-sm" disabled={rows.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>
                Siguiente →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

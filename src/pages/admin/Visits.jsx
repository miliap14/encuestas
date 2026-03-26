import { useState, useEffect } from 'react'
import { supabaseEncuestas } from '../../lib/supabaseEncuestas'

export default function Visits() {
  const [visitas, setVisitas] = useState([])
  const [areas, setAreas] = useState([])
  const [secciones, setSecciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ area_id: '', seccion_id: '', desde: '', hasta: '' })
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  useEffect(() => {
    loadAreasAndSecciones()
    loadVisitas()
  }, [])

  async function loadAreasAndSecciones() {
    const { data: a } = await supabaseEncuestas.from('areas').select('*').order('id')
    setAreas(a || [])
    const { data: s } = await supabaseEncuestas.from('secciones').select('*').order('id')
    setSecciones(s || [])
  }

  async function loadVisitas() {
    setLoading(true)
    let query = supabaseEncuestas
      .from('visitas')
      .select(`
        *,
        area:areas(descripcion),
        seccion:secciones(descripcion),
        respuesta:respuestas(id, estado, comentario)
      `)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (filters.area_id) query = query.eq('area_id', filters.area_id)
    if (filters.seccion_id) query = query.eq('seccion_id', filters.seccion_id)
    if (filters.desde) query = query.gte('created_at', filters.desde)
    if (filters.hasta) query = query.lte('created_at', filters.hasta + 'T23:59:59')

    const { data } = await query
    setVisitas(data || [])
    setLoading(false)
  }

  useEffect(() => { loadVisitas() }, [filters, page])

  const filteredSecciones = filters.area_id
    ? secciones.filter(s => s.area_id === parseInt(filters.area_id))
    : secciones

  return (
    <div>
      <div className="page-header">
        <div className="overline">Historial</div>
        <h1>Visitas Ciudadanas</h1>
        <p>Registro completo de todas las visitas con su estado de encuesta asociado.</p>
      </div>

      <div className="filter-bar">
        <select
          value={filters.area_id}
          onChange={e => setFilters({ ...filters, area_id: e.target.value, seccion_id: '' })}
        >
          <option value="">Todas las áreas</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.descripcion}</option>)}
        </select>

        <select
          value={filters.seccion_id}
          onChange={e => setFilters({ ...filters, seccion_id: e.target.value })}
        >
          <option value="">Todas las secciones</option>
          {filteredSecciones.map(s => <option key={s.id} value={s.id}>{s.descripcion}</option>)}
        </select>

        <input
          type="date"
          value={filters.desde}
          onChange={e => setFilters({ ...filters, desde: e.target.value })}
          placeholder="Desde"
        />
        <input
          type="date"
          value={filters.hasta}
          onChange={e => setFilters({ ...filters, hasta: e.target.value })}
          placeholder="Hasta"
        />

        {(filters.area_id || filters.seccion_id || filters.desde || filters.hasta) && (
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setFilters({ area_id: '', seccion_id: '', desde: '', hasta: '' })}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : visitas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <h3>Sin visitas registradas</h3>
            <p>Las visitas ciudadanas aparecerán aquí cuando sean registradas.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Persona ID</th>
                  <th>Área</th>
                  <th>Sección</th>
                  <th>Motivo</th>
                  <th>Prioridad</th>
                  <th>Encuesta</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {visitas.map(v => {
                  const resp = v.respuesta?.[0]
                  return (
                    <tr key={v.id}>
                      <td><strong>#{v.id}</strong></td>
                      <td>{v.persona_id}</td>
                      <td>{v.area?.descripcion || '—'}</td>
                      <td>{v.seccion?.descripcion || '—'}</td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v.motivo || '—'}
                      </td>
                      <td><span className={`badge ${v.prioridad}`}>{v.prioridad}</span></td>
                      <td>{v.encuesta_enviada ? '✅ Enviada' : '⏳ No enviada'}</td>
                      <td>
                        {resp
                          ? <span className={`badge ${resp.estado}`}>{resp.estado?.replace('_', ' ')}</span>
                          : <span className="badge pendiente">sin respuesta</span>
                        }
                      </td>
                      <td>{new Date(v.created_at).toLocaleDateString('es-AR')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {visitas.length >= PAGE_SIZE && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px', gap: '8px' }}>
            <button className="btn btn-outline btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              ← Anterior
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setPage(p => p + 1)}>
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

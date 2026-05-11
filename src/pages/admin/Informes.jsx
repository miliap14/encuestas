import { useState, useEffect, useMemo } from 'react'
import { supabaseEncuestas } from '../../lib/supabaseEncuestas'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const PIE_COLORS = ['#0A1929', '#1565C0', '#42A5F5', '#90CAF9', '#1976D2', '#0D47A1', '#5E92F3', '#003C8F', '#64B5F6', '#1E88E5']

const PRESETS = [
  { key: '30d', label: 'Últimos 30 días' },
  { key: 'mes', label: 'Este mes' },
  { key: 'anio', label: 'Este año' },
  { key: 'todo', label: 'Histórico total' },
]

function computeRange(presetKey, customFrom, customTo) {
  const now = new Date()
  if (presetKey === 'custom') {
    return {
      from: customFrom ? new Date(customFrom + 'T00:00:00') : null,
      to: customTo ? new Date(customTo + 'T23:59:59.999') : null,
    }
  }
  if (presetKey === 'todo') return { from: null, to: null }
  if (presetKey === '30d') {
    const from = new Date(now); from.setDate(from.getDate() - 30); from.setHours(0,0,0,0)
    return { from, to: now }
  }
  if (presetKey === 'mes') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    return { from, to: now }
  }
  if (presetKey === 'anio') {
    const from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
    return { from, to: now }
  }
  return { from: null, to: null }
}

function fmtDate(d) {
  if (!d) return '—'
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function pct(num, den) {
  if (!den) return '0,0%'
  return ((num / den) * 100).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
}

function avg(values) {
  if (!values.length) return null
  return values.reduce((s, v) => s + v, 0) / values.length
}

export default function Informes() {
  const [preset, setPreset] = useState('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [areas, setAreas] = useState([])
  const [secciones, setSecciones] = useState([])
  const [visitas, setVisitas] = useState([])
  const [respuestas, setRespuestas] = useState([])
  const [detalles, setDetalles] = useState([])
  const [generadoEn, setGeneradoEn] = useState(new Date())

  const range = useMemo(() => computeRange(preset, customFrom, customTo), [preset, customFrom, customTo])

  useEffect(() => {
    loadData()
  }, [preset, customFrom, customTo])

  async function loadData() {
    setLoading(true)
    try {
      const [areasRes, seccionesRes] = await Promise.all([
        supabaseEncuestas.from('areas').select('id, descripcion').eq('activo', true),
        supabaseEncuestas.from('secciones').select('id, descripcion, area_id').eq('activo', true),
      ])
      setAreas(areasRes.data || [])
      setSecciones(seccionesRes.data || [])

      let visitasQ = supabaseEncuestas.from('visitas').select('id, area_id, seccion_id, created_at')
      if (range.from) visitasQ = visitasQ.gte('created_at', range.from.toISOString())
      if (range.to) visitasQ = visitasQ.lte('created_at', range.to.toISOString())
      const { data: vData } = await visitasQ
      const visitasList = vData || []
      setVisitas(visitasList)

      const visitaIds = visitasList.map(v => v.id)
      if (visitaIds.length === 0) {
        setRespuestas([])
        setDetalles([])
        setGeneradoEn(new Date())
        setLoading(false)
        return
      }

      const { data: rData } = await supabaseEncuestas
        .from('respuestas')
        .select('id, visita_id')
        .in('visita_id', visitaIds)
      const respuestasList = rData || []
      setRespuestas(respuestasList)

      const respuestaIds = respuestasList.map(r => r.id)
      if (respuestaIds.length === 0) {
        setDetalles([])
        setGeneradoEn(new Date())
        setLoading(false)
        return
      }

      const { data: dData } = await supabaseEncuestas
        .from('respuesta_detalles')
        .select('respuesta_id, pregunta_id, calificacion, opciones_seleccionadas')
        .in('respuesta_id', respuestaIds)
      setDetalles(dData || [])

      setGeneradoEn(new Date())
    } catch (err) {
      console.error('Error loading informe:', err)
    }
    setLoading(false)
  }

  const stats = useMemo(() => {
    const totalVisitas = visitas.length
    const totalRespuestas = respuestas.length
    const calificaciones = detalles.filter(d => d.calificacion != null).map(d => d.calificacion)
    const satisfaccion = avg(calificaciones)

    const respuestaToVisita = Object.fromEntries(respuestas.map(r => [r.id, r.visita_id]))
    const visitaToArea = Object.fromEntries(visitas.map(v => [v.id, v.area_id]))
    const visitaToSeccion = Object.fromEntries(visitas.map(v => [v.id, v.seccion_id]))

    const byArea = areas.map(a => {
      const visitasArea = visitas.filter(v => v.area_id === a.id)
      const respuestasArea = respuestas.filter(r => visitaToArea[r.visita_id] === a.id)
      const respuestaIdsArea = new Set(respuestasArea.map(r => r.id))
      const califArea = detalles
        .filter(d => respuestaIdsArea.has(d.respuesta_id) && d.calificacion != null)
        .map(d => d.calificacion)
      return {
        id: a.id,
        nombre: a.descripcion,
        visitas: visitasArea.length,
        respuestas: respuestasArea.length,
        satisfaccion: avg(califArea),
      }
    }).filter(a => a.visitas > 0 || a.respuestas > 0)

    const bySeccion = secciones.map(s => {
      const visitasSec = visitas.filter(v => v.seccion_id === s.id)
      const respuestasSec = respuestas.filter(r => visitaToSeccion[r.visita_id] === s.id)
      const respuestaIdsSec = new Set(respuestasSec.map(r => r.id))
      const califSec = detalles
        .filter(d => respuestaIdsSec.has(d.respuesta_id) && d.calificacion != null)
        .map(d => d.calificacion)
      const area = areas.find(a => a.id === s.area_id)
      return {
        id: s.id,
        nombre: s.descripcion,
        area: area?.descripcion || '—',
        visitas: visitasSec.length,
        respuestas: respuestasSec.length,
        satisfaccion: avg(califSec),
      }
    }).filter(s => s.visitas > 0 || s.respuestas > 0)

    const serviciosMap = {}
    detalles.forEach(d => {
      const opciones = d.opciones_seleccionadas
      if (Array.isArray(opciones)) {
        opciones.forEach(opt => {
          if (!opt) return
          serviciosMap[opt] = (serviciosMap[opt] || 0) + 1
        })
      }
    })
    const servicios = Object.entries(serviciosMap)
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => b.count - a.count)

    return {
      totalVisitas,
      totalRespuestas,
      satisfaccion,
      byArea: byArea.sort((a, b) => b.visitas - a.visitas),
      bySeccion: bySeccion.sort((a, b) => b.visitas - a.visitas),
      servicios,
    }
  }, [visitas, respuestas, detalles, areas, secciones])

  const totalServiciosVotos = stats.servicios.reduce((s, x) => s + x.count, 0)

  function handlePrint() {
    window.print()
  }

  const rangoLabel = preset === 'todo'
    ? 'Histórico total'
    : preset === 'custom'
      ? `${fmtDate(range.from)} — ${fmtDate(range.to)}`
      : `${PRESETS.find(p => p.key === preset)?.label} (${fmtDate(range.from)} — ${fmtDate(range.to)})`

  return (
    <div className="informes-page">
      <div className="page-header no-print">
        <div className="overline">Informes</div>
        <h1>Informe de Métricas</h1>
        <p>Indicadores de visitas, respuestas, satisfacción y servicios a mejorar.</p>
      </div>

      <div className="informe-toolbar no-print">
        <div className="informe-presets">
          {PRESETS.map(p => (
            <button
              key={p.key}
              className={`preset-btn ${preset === p.key ? 'active' : ''}`}
              onClick={() => setPreset(p.key)}
            >
              {p.label}
            </button>
          ))}
          <button
            className={`preset-btn ${preset === 'custom' ? 'active' : ''}`}
            onClick={() => setPreset('custom')}
          >
            Rango personalizado
          </button>
        </div>

        {preset === 'custom' && (
          <div className="informe-custom-range">
            <label>
              Desde
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            </label>
            <label>
              Hasta
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} />
            </label>
          </div>
        )}

        <button className="btn-primary" onClick={handlePrint} disabled={loading}>
          📄 Descargar PDF
        </button>
      </div>

      <div className="informe-doc">
        <header className="informe-doc-header">
          <div className="informe-doc-brand">
            <h2>Municipalidad de Justiniano Posse</h2>
            <p>Informe de calidad de servicio</p>
          </div>
          <div className="informe-doc-meta">
            <div><strong>Rango:</strong> {rangoLabel}</div>
            <div><strong>Generado:</strong> {generadoEn.toLocaleString('es-AR')}</div>
          </div>
        </header>

        {loading ? (
          <div className="loading-container" style={{ minHeight: '200px' }}>
            <div className="spinner" />
          </div>
        ) : (
          <>
            <section className="informe-section">
              <h2 className="informe-section-title">Global</h2>
              <div className="informe-global-grid">
                <div className="informe-metric">
                  <div className="informe-metric-label">Visitas registradas</div>
                  <div className="informe-metric-value">{stats.totalVisitas.toLocaleString('es-AR')}</div>
                </div>
                <div className="informe-metric">
                  <div className="informe-metric-label">Encuestas respondidas</div>
                  <div className="informe-metric-value">{stats.totalRespuestas.toLocaleString('es-AR')}</div>
                  <div className="informe-metric-sub">{pct(stats.totalRespuestas, stats.totalVisitas)} de las visitas</div>
                </div>
                <div className="informe-metric">
                  <div className="informe-metric-label">Satisfacción promedio</div>
                  <div className="informe-metric-value">
                    {stats.satisfaccion != null ? stats.satisfaccion.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                    <small> / 5</small>
                  </div>
                </div>
              </div>
            </section>

            <section className="informe-section">
              <h2 className="informe-section-title">Por Área</h2>
              {stats.byArea.length === 0 ? (
                <p className="informe-empty">Sin datos para el rango seleccionado.</p>
              ) : (
                <table className="informe-table">
                  <thead>
                    <tr>
                      <th>Área</th>
                      <th className="num">Visitas</th>
                      <th className="num">% del total</th>
                      <th className="num">Respuestas</th>
                      <th className="num">% del total</th>
                      <th className="num">Satisfacción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byArea.map(a => (
                      <tr key={a.id}>
                        <td>{a.nombre}</td>
                        <td className="num">{a.visitas}</td>
                        <td className="num">{pct(a.visitas, stats.totalVisitas)}</td>
                        <td className="num">{a.respuestas}</td>
                        <td className="num">{pct(a.respuestas, stats.totalRespuestas)}</td>
                        <td className="num">
                          {a.satisfaccion != null
                            ? `${a.satisfaccion.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / 5`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="informe-section">
              <h2 className="informe-section-title">Por Sección</h2>
              {stats.bySeccion.length === 0 ? (
                <p className="informe-empty">Sin datos para el rango seleccionado.</p>
              ) : (
                <table className="informe-table">
                  <thead>
                    <tr>
                      <th>Sección</th>
                      <th>Área</th>
                      <th className="num">Visitas</th>
                      <th className="num">% del total</th>
                      <th className="num">Respuestas</th>
                      <th className="num">% del total</th>
                      <th className="num">Satisfacción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.bySeccion.map(s => (
                      <tr key={s.id}>
                        <td>{s.nombre}</td>
                        <td>{s.area}</td>
                        <td className="num">{s.visitas}</td>
                        <td className="num">{pct(s.visitas, stats.totalVisitas)}</td>
                        <td className="num">{s.respuestas}</td>
                        <td className="num">{pct(s.respuestas, stats.totalRespuestas)}</td>
                        <td className="num">
                          {s.satisfaccion != null
                            ? `${s.satisfaccion.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / 5`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="informe-section informe-section-servicios">
              <h2 className="informe-section-title">Servicios que deberíamos mejorar</h2>
              {stats.servicios.length === 0 ? (
                <p className="informe-empty">Sin votos en el rango seleccionado.</p>
              ) : (
                <div className="informe-servicios">
                  <div className="informe-servicios-chart">
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={stats.servicios}
                          dataKey="count"
                          nameKey="nombre"
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                        >
                          {stats.servicios.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val, name) => [`${val} votos`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="informe-servicios-legend">
                    <table className="informe-table compact">
                      <thead>
                        <tr>
                          <th></th>
                          <th>Servicio</th>
                          <th className="num">Votos</th>
                          <th className="num">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.servicios.map((s, i) => (
                          <tr key={s.nombre}>
                            <td><span className="legend-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} /></td>
                            <td>{s.nombre}</td>
                            <td className="num">{s.count}</td>
                            <td className="num">{pct(s.count, totalServiciosVotos)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

            <footer className="informe-doc-footer">
              Justiniano Posse — Sistema de Encuestas Ciudadanas
            </footer>
          </>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabaseEncuestas } from '../../lib/supabaseEncuestas'
import StatsCard from '../../components/StatsCard'
import StarRating from '../../components/StarRating'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#0A1929', '#1565C0', '#B0B0C0', '#42A5F5']

export default function Dashboard() {
  const [stats, setStats] = useState({ avgRating: 0, totalVisits: 0, totalResponses: 0, responseRate: 0 })
  const [chartData, setChartData] = useState([])
  const [recentResponses, setRecentResponses] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      // Total visits
      const { count: totalVisits } = await supabaseEncuestas
        .from('visitas').select('*', { count: 'exact', head: true })

      // Total responses
      const { count: totalResponses } = await supabaseEncuestas
        .from('respuestas').select('*', { count: 'exact', head: true })

      // Average rating — solo detalles que tienen calificación (tipo estrellas)
      const { data: detalles } = await supabaseEncuestas
        .from('respuesta_detalles').select('calificacion').not('calificacion', 'is', null)

      const avgRating = detalles?.length
        ? (detalles.reduce((s, d) => s + d.calificacion, 0) / detalles.length).toFixed(1)
        : 0

      const responseRate = totalVisits > 0
        ? ((totalResponses / totalVisits) * 100).toFixed(1)
        : 0

      setStats({ avgRating, totalVisits: totalVisits || 0, totalResponses: totalResponses || 0, responseRate })

      // Chart data - last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: visitsByDay } = await supabaseEncuestas
        .from('visitas')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at')

      const dayMap = {}
      for (let i = 0; i < 30; i++) {
        const d = new Date()
        d.setDate(d.getDate() - 29 + i)
        const key = d.toISOString().split('T')[0]
        dayMap[key] = 0
      }
      visitsByDay?.forEach(v => {
        const key = v.created_at.split('T')[0]
        if (dayMap[key] !== undefined) dayMap[key]++
      })

      setChartData(Object.entries(dayMap).map(([date, count]) => ({
        day: new Date(date).getDate().toString().padStart(2, '0'),
        visitas: count
      })).filter((_, i) => i % 3 === 0))

      // Recent responses with details
      const { data: recent } = await supabaseEncuestas
        .from('respuestas')
        .select(`
          id, comentario, estado, created_at,
          visita:visitas(persona_id, area:areas(descripcion), seccion:secciones(descripcion))
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentResponses(recent || [])

      // Category breakdown
      const { data: catData } = await supabaseEncuestas
        .from('respuesta_detalles')
        .select('pregunta:preguntas(categoria), calificacion')

      const catMap = {}
      catData?.forEach(d => {
        const cat = d.pregunta?.categoria || 'Sin categoría'
        if (!catMap[cat]) catMap[cat] = { total: 0, count: 0 }
        catMap[cat].total += d.calificacion
        catMap[cat].count++
      })

      const catArray = Object.entries(catMap).map(([name, { count }]) => ({
        name,
        value: count
      }))
      setCategoryData(catArray.length ? catArray : [
        { name: 'Sin datos aún', value: 1 }
      ])

    } catch (err) {
      console.error('Error loading dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading-container"><div className="spinner" /></div>
  }

  const totalCat = categoryData.reduce((s, c) => s + c.value, 0)

  return (
    <div>
      <div className="page-header">
        <div className="overline">Resumen Ejecutivo</div>
        <h1>Centro de Control Administrativo</h1>
        <p>Visibilidad de alto nivel sobre las operaciones municipales y métricas de sentimiento ciudadano.</p>
      </div>

      <div className="stats-grid">
        <StatsCard
          icon="⭐"
          label="Satisfacción Promedio"
          value={stats.avgRating}
          subValue="/ 5.0"
          colorClass="blue"
        />
        <StatsCard
          icon="👥"
          label="Total Visitas"
          value={stats.totalVisits.toLocaleString()}
          colorClass="green"
        />
        <StatsCard
          icon="💬"
          label="Total Respuestas"
          value={stats.totalResponses.toLocaleString()}
          colorClass="navy"
        />
        <StatsCard
          icon="📈"
          label="Tasa de Respuesta"
          value={`${stats.responseRate}%`}
          colorClass="warning"
        />
      </div>

      <div className="grid-2" style={{ marginBottom: '28px' }}>
        <div className="card">
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy-900)' }}>
                Visitas Últimos 30 Días
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E8F0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#B0B0C0" />
                <YAxis tick={{ fontSize: 12 }} stroke="#B0B0C0" />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E8E8F0', fontSize: '13px' }}
                />
                <Bar dataKey="visitas" fill="#0A1929" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy-900)', marginBottom: '16px' }}>
              Respuestas por Categoría
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    dataKey="value"
                    strokeWidth={2}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-legend">
                {categoryData.map((item, i) => (
                  <div key={i} className="donut-legend-item">
                    <span className="dot" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="legend-label">{item.name}</span>
                    <span className="legend-value">
                      {totalCat > 0 ? Math.round((item.value / totalCat) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy-900)' }}>
              Comentarios Recientes Destacados
            </h3>
          </div>

          {recentResponses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <h3>Sin comentarios aún</h3>
              <p>Los comentarios de las encuestas aparecerán aquí.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Área</th>
                    <th>Comentario</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {recentResponses.map(r => (
                    <tr key={r.id}>
                      <td>{r.visita?.area?.descripcion || '—'}</td>
                      <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.comentario ? `"${r.comentario}"` : '—'}
                      </td>
                      <td><span className={`badge ${r.estado}`}>{r.estado?.replace('_', ' ')}</span></td>
                      <td>{new Date(r.created_at).toLocaleDateString('es-AR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

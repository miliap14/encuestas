import { useState, useEffect } from 'react'
import { supabaseEncuestas } from '../../lib/supabaseEncuestas'

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 30

  useEffect(() => { loadLogs() }, [page])

  async function loadLogs() {
    setLoading(true)
    const { data } = await supabaseEncuestas
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    setLogs(data || [])
    setLoading(false)
  }

  const actionLabels = {
    crear_pregunta: { label: 'Pregunta creada', color: 'var(--success)' },
    editar_pregunta: { label: 'Pregunta editada', color: 'var(--blue-600)' },
    eliminar_pregunta: { label: 'Pregunta eliminada', color: 'var(--error)' },
    actualizar_config: { label: 'Config actualizada', color: 'var(--warning)' },
    crear_visita: { label: 'Visita registrada', color: 'var(--success)' },
    enviar_encuesta: { label: 'Encuesta enviada', color: 'var(--info)' },
  }

  return (
    <div>
      <div className="page-header">
        <div className="overline">Sistema</div>
        <h1>Registro de Auditoría</h1>
        <p>Historial completo de acciones realizadas en el sistema.</p>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>Sin registros de auditoría</h3>
            <p>Las acciones del sistema se registrarán aquí automáticamente.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha/Hora</th>
                  <th>Acción</th>
                  <th>Tabla</th>
                  <th>Registro</th>
                  <th>Detalles</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const actionInfo = actionLabels[log.accion] || { label: log.accion, color: 'var(--gray-600)' }
                  return (
                    <tr key={log.id}>
                      <td>{new Date(log.created_at).toLocaleString('es-AR')}</td>
                      <td>
                        <span style={{ color: actionInfo.color, fontWeight: 600 }}>
                          {actionInfo.label}
                        </span>
                      </td>
                      <td>{log.tabla || '—'}</td>
                      <td>{log.registro_id || '—'}</td>
                      <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                        {log.detalles ? JSON.stringify(log.detalles) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px', gap: '8px' }}>
          <button className="btn btn-outline btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            ← Anterior
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setPage(p => p + 1)}>
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  )
}

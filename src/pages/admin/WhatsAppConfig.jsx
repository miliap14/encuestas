import { useState, useEffect, useRef } from 'react'
import { evolutionApi } from '../../lib/evolutionApi'

export default function WhatsAppConfig() {
  const [status, setStatus] = useState(null) // 'open', 'close', 'connecting', null
  const [qrCode, setQrCode] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const intervalRef = useRef(null)

  useEffect(() => {
    checkStatus()
    return () => clearInterval(intervalRef.current)
  }, [])

  async function checkStatus() {
    setLoading(true)
    try {
      const res = await evolutionApi.getConnectionState()
      const state = res?.instance?.state || res?.state || null
      setStatus(state)

      if (state !== 'open') {
        startQrRefresh()
      } else {
        clearInterval(intervalRef.current)
        setQrCode(null)
      }
    } catch (err) {
      console.error('Error checking status:', err)
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }

  async function startQrRefresh() {
    await fetchQr()
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(fetchQr, 10000)
  }

  async function fetchQr() {
    try {
      const res = await evolutionApi.connect()
      if (res?.base64) {
        setQrCode(res.base64)
      } else if (res?.instance?.state === 'open') {
        setStatus('open')
        setQrCode(null)
        clearInterval(intervalRef.current)
      }
    } catch (err) {
      console.error('Error fetching QR:', err)
    }
  }

  async function handleRestart() {
    setActionLoading('restart')
    try {
      await evolutionApi.restart()
      await new Promise(r => setTimeout(r, 2000))
      await checkStatus()
    } catch (err) {
      console.error('Error restarting:', err)
    }
    setActionLoading('')
  }

  async function handleLogout() {
    if (!window.confirm('¿Desconectar la sesión de WhatsApp?')) return
    setActionLoading('logout')
    try {
      await evolutionApi.logout()
      setStatus('close')
      setQrCode(null)
      startQrRefresh()
    } catch (err) {
      console.error('Error logging out:', err)
    }
    setActionLoading('')
  }

  async function handleRecreate() {
    if (!window.confirm('¿Eliminar y recrear la instancia? Deberás escanear el QR nuevamente.')) return
    setActionLoading('recreate')
    try {
      await evolutionApi.deleteInstance()
      await new Promise(r => setTimeout(r, 1000))
      await evolutionApi.createInstance()
      await new Promise(r => setTimeout(r, 2000))
      await checkStatus()
    } catch (err) {
      console.error('Error recreating:', err)
    }
    setActionLoading('')
  }

  if (loading) {
    return <div className="loading-container"><div className="spinner" /></div>
  }

  return (
    <div>
      <div className="page-header">
        <div className="overline">Configuración</div>
        <h1>WhatsApp</h1>
        <p>Gestioná la conexión de WhatsApp para el envío de encuestas de satisfacción.</p>
      </div>

      <div className="grid-2">
        {/* Status */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy-900)', marginBottom: '20px' }}>
              📱 Estado de Conexión
            </h3>

            <div className={`whatsapp-status ${status === 'open' ? 'connected' : 'disconnected'}`}>
              <span style={{ fontSize: '1.2rem' }}>{status === 'open' ? '🟢' : '🔴'}</span>
              {status === 'open' ? 'Sesión Activa' : 'Desconectado'}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={handleRestart}
                disabled={!!actionLoading}
              >
                {actionLoading === 'restart' ? '⏳...' : '🔄 Reiniciar'}
              </button>
              {status === 'open' && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={handleLogout}
                  disabled={!!actionLoading}
                  style={{ color: 'var(--error)' }}
                >
                  {actionLoading === 'logout' ? '⏳...' : '🚪 Desconectar'}
                </button>
              )}
              <button
                className="btn btn-outline btn-sm"
                onClick={handleRecreate}
                disabled={!!actionLoading}
                style={{ color: 'var(--warning)' }}
              >
                {actionLoading === 'recreate' ? '⏳...' : '♻️ Recrear Instancia'}
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={checkStatus}
                disabled={!!actionLoading}
              >
                🔍 Verificar Estado
              </button>
            </div>
          </div>
        </div>

        {/* QR Code */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy-900)', marginBottom: '20px' }}>
              📷 Código QR
            </h3>

            {status === 'open' ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--success)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
                <p style={{ fontWeight: 600 }}>Sesión activa, no es necesario escanear QR</p>
              </div>
            ) : qrCode ? (
              <div className="qr-container">
                <img src={qrCode} alt="QR Code WhatsApp" />
                <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--gray-600)', textAlign: 'center' }}>
                  Escaneá este código con WhatsApp.
                  <br />Se actualiza cada 10 segundos.
                </p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📱</div>
                <p>Cargando código QR...</p>
                <button className="btn btn-blue btn-sm" onClick={startQrRefresh} style={{ marginTop: '12px' }}>
                  Obtener QR
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

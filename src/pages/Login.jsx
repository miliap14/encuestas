import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signInWithOAuth, user } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) {
    navigate('/dashboard', { replace: true })
    return null
  }

  const handleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithOAuth()
      // El browser será redirigido a Authentik, no hay acción adicional aquí
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión')
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <h2>Civic Horizon</h2>
          <p>Municipalidad de Justiniano Posse</p>
        </div>
        <h1>Iniciar Sesión</h1>
        <p className="login-subtitle">Accedé al portal de administración</p>

        {error && <div className="login-error">{error}</div>}

        <button
          onClick={handleLogin}
          className="btn btn-primary btn-lg"
          disabled={loading}
          style={{ width: '100%', marginTop: '8px' }}
        >
          {loading ? 'Redirigiendo...' : 'Ingresar con Authentik'}
        </button>
      </div>
    </div>
  )
}

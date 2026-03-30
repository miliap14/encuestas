import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabaseEncuestas } from '../lib/supabaseEncuestas'

const API_URL = import.meta.env.VITE_API_URL

async function resolveAuthEmail(identifier) {
  // Si no tiene @, es un DNI — construimos el email directamente
  if (!identifier.includes('@')) {
    return `${identifier.trim()}@munijposse.com.ar`
  }

  // Si ya es el email ficticio, lo usamos directamente
  if (identifier.endsWith('@munijposse.com.ar')) {
    return identifier.trim()
  }

  // Es un email real → pedimos al backend que lo resuelva
  const res = await fetch(`${API_URL}/auth/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'No se encontró un usuario con ese email')
  return json.email
}

export default function Login() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) {
    navigate('/dashboard', { replace: true })
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const email = await resolveAuthEmail(identifier)
      const { error: signInError } = await supabaseEncuestas.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const isEmail = identifier.includes('@') && !identifier.endsWith('@munijposse.com.ar')

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <h2>Administración Encuestas</h2>
          <p>Municipalidad de Justiniano Posse</p>
        </div>
        <h1>Iniciar Sesión</h1>
        <p className="login-subtitle">Accedé al portal de administración</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="identifier">DNI o correo electrónico</label>
            <input
              id="identifier"
              type="text"
              className="form-control"
              placeholder="DNI o correo"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />
            {isEmail && (
              <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: '4px' }}>
                Se buscará el DNI asociado a este email
              </div>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}

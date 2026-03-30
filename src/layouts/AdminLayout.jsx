import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { to: '/dashboard', icon: '📊', label: 'Resumen' },
  { to: '/encuestas', icon: '📋', label: 'Gestionar Encuestas' },
  { to: '/areas', icon: '🏛️', label: 'Áreas y Secciones' },
  { to: '/visitas', icon: '📁', label: 'Historial Visitas' },
  { to: '/auditoria', icon: '🔍', label: 'Registro de Auditoría' },
  { to: '/whatsapp', icon: '📱', label: 'WhatsApp' },
  { to: '/usuarios', icon: '👥', label: 'Usuarios' },
]

const topNavItems = [
  { to: '/dashboard', label: 'Tablero' },
  { to: '/encuestas', label: 'Encuestas' },
  { to: '/visitas', label: 'Visitas' },
  { to: '/whatsapp', label: 'Ajustes' },
]

export default function AdminLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const userInitials = user?.email?.substring(0, 2).toUpperCase() || 'AD'

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>Administración Encuestas</h2>
          <p>Portal de Administración</p>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <a href="#" onClick={e => { e.preventDefault() }}>❓ Ayuda</a>
          <a href="#" onClick={e => { e.preventDefault(); handleSignOut() }}>🚪 Cerrar sesión</a>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <span className="brand-text">Justiniano Posse</span>
            <nav className="topbar-nav">
              {topNavItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="topbar-right">
            <button className="icon-btn">🔔</button>
            <div className="avatar">{userInitials}</div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

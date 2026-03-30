import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AdminLayout from './layouts/AdminLayout'
import Login from './pages/Login'
import Dashboard from './pages/admin/Dashboard'
import ManageSurveys from './pages/admin/ManageSurveys'
import Visits from './pages/admin/Visits'
import AuditLog from './pages/admin/AuditLog'
import WhatsAppConfig from './pages/admin/WhatsAppConfig'
import AreasConfig from './pages/admin/AreasConfig'
import Usuarios from './pages/admin/Usuarios'
import SurveyForm from './pages/survey/SurveyForm'
import ThankYou from './pages/survey/ThankYou'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-container"><div className="spinner" /></div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/encuesta/:token" element={<SurveyForm />} />
      <Route path="/encuesta/gracias" element={<ThankYou />} />

      {/* Protected */}
      <Route path="/" element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="encuestas" element={<ManageSurveys />} />
        <Route path="visitas" element={<Visits />} />
        <Route path="auditoria" element={<AuditLog />} />
        <Route path="areas" element={<AreasConfig />} />
        <Route path="whatsapp" element={<WhatsAppConfig />} />
        <Route path="usuarios" element={<Usuarios />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

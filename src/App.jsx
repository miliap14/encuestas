import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import AdminLayout from './layouts/AdminLayout'
import Login from './pages/Login'
import Dashboard from './pages/admin/Dashboard'
import ManageSurveys from './pages/admin/ManageSurveys'
import Visits from './pages/admin/Visits'
import AuditLog from './pages/admin/AuditLog'
import WhatsAppConfig from './pages/admin/WhatsAppConfig'
import SurveyForm from './pages/survey/SurveyForm'
import ThankYou from './pages/survey/ThankYou'
import AuthCallback from './pages/AuthCallback'

function ProtectedRoute({ children }) {
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
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
        <Route path="whatsapp" element={<WhatsAppConfig />} />
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

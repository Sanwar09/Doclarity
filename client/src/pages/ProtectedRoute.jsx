import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthProvider'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-[50vh] grid place-items-center">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}
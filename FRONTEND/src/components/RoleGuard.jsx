import { Navigate, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function RequireAuth({ children }) {
  const { token } = useAuth()
  const location = useLocation()
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

export function RequireAdmin({ children }) {
  const { role } = useAuth()
  if (role !== 'administrador') return <div>No autorizado (solo administrador).</div>
  return children
}

export function RequireAdminOrOwnUser({ children }) {
  const { role, user } = useAuth()
  const { id } = useParams()
  const location = useLocation()
  
  // Si es administrador, permitir acceso
  if (role === 'administrador') return children
  
  // Si es editor, solo permitir si está editando su propio usuario
  if (role === 'editor' && user?.usuarioId && id && Number(user.usuarioId) === Number(id)) {
    return children
  }
  
  // No autorizado
  return <div>No autorizado. Solo puedes editar tu propio usuario.</div>
}



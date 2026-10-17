import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import type { Role } from '@/lib/types'
import { EmptyState, Loading } from './ui'

/** Everything inside requires a logged-in user. */
export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/**
 * Hides owner-only screens from workers. This is only UX: the backend enforces
 * the same rules and answers 403 to anything a worker is not allowed to call.
 */
export function RequireRole({ roles }: { roles: Role[] }) {
  const { hasRole } = useAuth()
  if (!hasRole(...roles)) {
    return <EmptyState icon={<ShieldAlert className="size-12" />} title="Owner access only" hint="Ask the shop owner if you need this." />
  }
  return <Outlet />
}

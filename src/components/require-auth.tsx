import { Navigate, Outlet } from "react-router"
import { useAuth } from "@/contexts/auth-context"

export default function RequireAuth() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Memuat sesi...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

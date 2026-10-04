import type { ReactNode } from "react"
import { Navigate } from "react-router"
import { useAuth } from "@/contexts/auth-context"
import type { User } from "@/lib/api"

interface RequireRoleProps {
  role: User["role"]
  children: ReactNode
}

export default function RequireRole({ role, children }: RequireRoleProps) {
  const { user } = useAuth()

  if (user?.role !== role) {
    return <Navigate to="/" replace />
  }

  return children
}

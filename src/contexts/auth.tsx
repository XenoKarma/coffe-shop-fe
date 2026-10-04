import { useEffect, useState, type ReactNode } from "react"
import { api, ApiError, clearToken, getToken, setToken, type LoginResponse, type User } from "@/lib/api"
import { AuthContext } from "@/contexts/auth-context"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => getToken() !== null)

  useEffect(() => {
    if (!getToken()) {
      return
    }

    api
      .get<{ data: User }>("/me")
      .then((response) => setUser(response.data))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          clearToken()
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string): Promise<void> {
    const response = await api.post<LoginResponse>("/login", {
      body: { email, password },
    })

    setToken(response.token)
    setUser(response.user)
  }

  async function logout(): Promise<void> {
    try {
      await api.post("/logout")
    } finally {
      clearToken()
      setUser(null)
    }
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

const API_BASE = "/api"

const TOKEN_KEY = "nara_token"

export interface User {
  id: number
  name: string
  email: string
  role: "admin" | "cashier"
}

export interface LoginResponse {
  message: string
  token: string
  user: User
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  readonly status: number
  readonly errors: Record<string, string[]>

  constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.errors = errors
  }
}

interface RequestOptions {
  body?: unknown
  signal?: AbortSignal
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const { body, signal } = options
  const isFormData = body instanceof FormData

  const headers: Record<string, string> = { Accept: "application/json" }
  const token = getToken()

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json"
  }

  let response: Response

  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      signal,
    })
  } catch {
    throw new ApiError(0, "Tidak dapat terhubung ke server.")
  }

  if (response.status === 204) {
    return undefined as T
  }

  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const record = (data ?? {}) as { message?: unknown; errors?: unknown }

    if (response.status === 401 && !path.startsWith("/login")) {
      clearToken()
      window.location.assign("/login")
    }

    throw new ApiError(
      response.status,
      typeof record.message === "string" ? record.message : `Request gagal (${response.status}).`,
      (record.errors ?? {}) as Record<string, string[]>,
    )
  }

  return data as T
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options),
  post: <T>(path: string, options?: RequestOptions) => request<T>("POST", path, options),
  put: <T>(path: string, options?: RequestOptions) => request<T>("PUT", path, options),
  patch: <T>(path: string, options?: RequestOptions) => request<T>("PATCH", path, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, options),
}

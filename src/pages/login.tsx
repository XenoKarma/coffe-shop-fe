import { useState, type FormEvent } from "react"
import { Navigate, useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { ApiError } from "@/lib/api"
import ImageWallpaper from "@/assets/images/wallpaper.jpg"
import { Coffee } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter} from "@/components/ui/card"
import { ErrorAlert } from "@/components/error-alert"

export default function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    setSubmitting(true)

    try {
      await login(email, password)
      navigate("/", { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setFieldErrors(err.errors)
      } else {
        setError("Terjadi kesalahan tak terduga.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4 ">
      {/* Background Image dengan Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm">
        <img
          src={ImageWallpaper}
          alt="Cafe Interior"
          className="h-full w-full object-cover bg-accent/50"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>
      {/* 2. Menggunakan komponen Card Shadcn UI */}
      <Card className="w-full max-w-md border-white/10 bg-zinc-900/80 text-zinc-100 shadow-2xl backdrop-blur-md">
        
        {/* Bagian Header Card */}
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-600/20 text-amber-500 ring-1 ring-amber-500/30">
            <Coffee className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight text-white">
              NARA Coffee Shop
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Masuk untuk mulai mengelola kasir & pesanan
            </CardDescription>
          </div>
        </CardHeader>

        {/* Bagian Isi / Content Card (Form Login) */}
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-zinc-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@nara.test"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={fieldErrors.email ? true : undefined}
                required
                className="bg-zinc-800/50 border-zinc-700/60 text-white placeholder:text-zinc-500 focus-visible:ring-amber-500"
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive">{fieldErrors.email[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-zinc-300">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={fieldErrors.password ? true : undefined}
                required
                className="bg-zinc-800/50 border-zinc-700/60 text-white placeholder:text-zinc-500 focus-visible:ring-amber-500"
              />
              {fieldErrors.password && (
                <p className="text-xs text-destructive">{fieldErrors.password[0]}</p>
              )}
            </div>

            <ErrorAlert message={error} className="border-destructive/30 bg-destructive/10" />

            <Button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2.5 transition-colors"
              disabled={submitting}
            >
              {submitting ? "Memproses..." : "Masuk ke POS"}
            </Button>
          </form>
        </CardContent>

        {/* Bagian Footer Card (Opsional, untuk info versi atau bantuan) */}
        <CardFooter className="flex flex-col items-center justify-center border-t border-zinc-800/80 pt-4 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-medium text-amber-500/90 tracking-wide">NARA Coffee Shop POS</span>
          </div>
          <span className="mt-1 text-zinc-500">Secure Staff Management • v1.0</span>
        </CardFooter>

      </Card>
    </div>
  )
}

import { TriangleAlert } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ErrorAlertProps {
  message: string | null
  className?: string
}

export function ErrorAlert({ message, className }: ErrorAlertProps) {
  if (!message) return null

  return (
    <Alert variant="destructive" className={className}>
      <TriangleAlert />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

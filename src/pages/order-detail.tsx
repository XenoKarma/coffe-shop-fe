import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, Banknote, Loader2, Receipt } from "lucide-react"
import { Link, useParams } from "react-router"
import { ErrorAlert } from "@/components/error-alert"
import { api, ApiError } from "@/lib/api"
import { formatDateTimeLong, formatRupiah } from "@/lib/format"
import type { Order } from "@/lib/types"
import { cn } from "cn"

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    (signal?: AbortSignal) => {
      return api
        .get<{ data: Order }>(`/orders/${orderId}`, { signal })
        .then((response) => {
          setOrder(response.data)
          setError(null)
        })
        .catch((err: unknown) => {
          if (err instanceof ApiError && err.status !== 0) {
            setError(err.status === 404 ? "Pesanan tidak ditemukan." : err.message)
          }
        })
        .finally(() => setLoading(false))
    },
    [orderId],
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)

    return () => controller.abort()
  }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
        <Loader2 className="animate-spin" />
        Memuat pesanan...
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Kembali ke riwayat
        </Link>
        <ErrorAlert message={error ?? "Terjadi kesalahan."} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Kembali ke riwayat
      </Link>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Receipt className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-mono text-sm font-semibold text-foreground">{order.order_number}</p>
              <p className="text-xs text-muted-foreground">{formatDateTimeLong(order.created_at)}</p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
              order.status === "paid"
                ? "bg-primary/10 text-primary"
                : order.status === "cancelled"
                  ? "bg-muted text-muted-foreground"
                  : "bg-destructive/10 text-destructive",
            )}
          >
            {order.status === "paid"
              ? "Lunas"
              : order.status === "cancelled"
                ? "Dibatalkan"
                : "Belum bayar"}
          </span>
        </div>

        <p className="pt-4 text-sm text-muted-foreground">
          Kasir: <span className="font-medium text-foreground">{order.cashier.name}</span>
        </p>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 text-right font-medium">Harga</th>
              <th className="py-2 text-center font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="py-2.5 text-foreground">{item.product_name}</td>
                <td className="py-2.5 text-right text-muted-foreground">{formatRupiah(item.price)}</td>
                <td className="py-2.5 text-center text-muted-foreground">{item.quantity}</td>
                <td className="py-2.5 text-right text-foreground">{formatRupiah(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="text-foreground">{formatRupiah(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Diskon</dt>
            <dd className="text-foreground">{formatRupiah(order.discount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Pajak</dt>
            <dd className="text-foreground">{formatRupiah(order.tax)}</dd>
          </div>
          <div className="flex justify-between pt-1 text-base font-semibold">
            <dt className="text-foreground">Total</dt>
            <dd className="text-foreground">{formatRupiah(order.total)}</dd>
          </div>
        </dl>
      </div>

      {order.payment ? (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Banknote className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Pembayaran</h2>
          </div>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Metode</dt>
              <dd className="font-medium text-foreground">{order.payment.method.toUpperCase()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Uang diterima</dt>
              <dd className="text-foreground">{formatRupiah(order.payment.paid_amount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Kembali</dt>
              <dd className="font-semibold text-primary">{formatRupiah(order.payment.change)}</dd>
            </div>
            {order.payment.paid_at && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Waktu bayar</dt>
                <dd className="text-foreground">{formatDateTimeLong(order.payment.paid_at)}</dd>
              </div>
            )}
          </dl>
        </div>
      ) : order.status === "cancelled" ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
          Pesanan ini dibatalkan — tidak perlu pembayaran.
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
          Menunggu pembayaran — selesaikan lewat menu POS.
        </div>
      )}
    </div>
  )
}

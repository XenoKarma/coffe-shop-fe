import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Eye, Loader2 } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { api, ApiError } from "@/lib/api"
import { formatDateTime, formatRupiah } from "@/lib/format"
import type { Order, PageMeta } from "@/lib/types"
import { cn } from "cn"

interface OrderIndexResponse {
  data: Order[]
  meta: PageMeta
}

const SELECT_CLASSES =
  "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [meta, setMeta] = useState<PageMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [status, setStatus] = useState("")
  const [date, setDate] = useState("")
  const [page, setPage] = useState(1)

  const load = useCallback(
    (signal?: AbortSignal) => {
      const params = new URLSearchParams()

      if (status) params.set("status", status)
      if (date) params.set("date", date)
      if (page > 1) params.set("page", String(page))

      const query = params.toString()

      return api
        .get<OrderIndexResponse>(`/orders${query ? `?${query}` : ""}`, { signal })
        .then((response) => {
          setOrders(response.data)
          setMeta(response.meta)
          setListError(null)
        })
        .catch((err: unknown) => {
          if (err instanceof ApiError && err.status !== 0) {
            setListError(err.message)
          }
        })
        .finally(() => setLoading(false))
    },
    [status, date, page],
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)

    return () => controller.abort()
  }, [load])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-lg font-semibold text-foreground">Riwayat Pesanan</h1>
        <p className="text-sm text-muted-foreground">Semua transaksi kasir, termasuk yang belum dibayar</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
          className={SELECT_CLASSES}
          aria-label="Filter status"
        >
          <option value="">Semua status</option>
          <option value="pending">Belum bayar</option>
          <option value="paid">Lunas</option>
        </select>

        <input
          type="date"
          value={date}
          onChange={(event) => {
            setDate(event.target.value)
            setPage(1)
          }}
          className={cn(SELECT_CLASSES, "text-muted-foreground")}
          aria-label="Filter tanggal"
        />

        {(status || date) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatus("")
              setDate("")
              setPage(1)
            }}
          >
            Atur ulang
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="animate-spin" />
            Memuat...
          </div>
        ) : listError ? (
          <div className="p-8 text-center text-sm text-destructive">{listError}</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Tidak ada pesanan.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">No. Order</th>
                  <th className="px-4 py-2.5 font-medium">Tanggal</th>
                  <th className="px-4 py-2.5 font-medium">Item</th>
                  <th className="px-4 py-2.5 font-medium">Kasir</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                  <th className="w-16 px-4 py-2.5 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs font-medium text-foreground">{order.order_number}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDateTime(order.created_at)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{order.items.length} item</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{order.cashier.name}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          order.status === "paid" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive",
                        )}
                      >
                        {order.status === "paid" ? "Lunas" : "Belum bayar"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-foreground">{formatRupiah(order.total)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        to={`/orders/${order.id}`}
                        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={`Lihat ${order.order_number}`}
                      >
                        <Eye className="size-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
            <ChevronLeft />
            Sebelumnya
          </Button>
          <span>
            Halaman {meta.current_page} dari {meta.last_page} &middot; {meta.total} pesanan
          </span>
          <Button variant="outline" size="sm" disabled={page >= meta.last_page} onClick={() => setPage((current) => current + 1)}>
            Berikutnya
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  )
}

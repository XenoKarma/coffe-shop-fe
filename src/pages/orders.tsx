import { useCallback, useEffect, useState } from "react"
import { Eye, Loader2 } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { usePersistedState } from "@/hooks/use-persisted-state"
import { api, ApiError } from "@/lib/api"
import { peekCache, writeCache } from "@/lib/cache"
import { formatDateTime, formatRupiah } from "@/lib/format"
import { pageItems } from "@/lib/pagination"
import type { Order, PageMeta } from "@/lib/types"
import { cn } from "cn"

interface OrderIndexResponse {
  data: Order[]
  meta: PageMeta
}

interface OrdersFilters {
  status: string
  date: string
}

const SELECT_CLASSES =
  "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export default function OrdersPage() {
  const [filters, setFilters] = usePersistedState<OrdersFilters>("nara:orders:filters", {
    status: "",
    date: "",
  })
  const [page, setPage] = usePersistedState<number>("nara:orders:page", 1)
  const { status, date } = filters

  const cacheKey = `orders:${status}:${date}:${page}`
  const [cached] = useState(() => peekCache<OrderIndexResponse>(cacheKey))
  const [orders, setOrders] = useState<Order[]>(() => cached?.data ?? [])
  const [meta, setMeta] = useState<PageMeta | null>(() => cached?.meta ?? null)
  const [loading, setLoading] = useState(() => cached === null)
  const [listError, setListError] = useState<string | null>(null)

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
          writeCache(cacheKey, response)

          if (response.meta.last_page < page) {
            setPage(response.meta.last_page)
          }
        })
        .catch((err: unknown) => {
          if (err instanceof ApiError && err.status !== 0) {
            setListError(err.message)
          }
        })
        .finally(() => setLoading(false))
    },
    [cacheKey, page, setPage, status, date],
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)

    return () => controller.abort()
  }, [load])

  function handleStatusChange(value: string) {
    setFilters({ ...filters, status: value })
    setPage(1)
  }

  function handleDateChange(value: string) {
    setFilters({ ...filters, date: value })
    setPage(1)
  }

  function handleReset() {
    setFilters({ status: "", date: "" })
    setPage(1)
  }

  function goToPage(target: number) {
    if (target >= 1 && (!meta || target <= meta.last_page)) {
      setPage(target)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-lg font-semibold text-foreground">Riwayat Pesanan</h1>
        <p className="text-sm text-muted-foreground">Semua transaksi kasir, termasuk yang belum dibayar</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(event) => handleStatusChange(event.target.value)}
          className={SELECT_CLASSES}
          aria-label="Filter status"
        >
          <option value="">Semua status</option>
          <option value="pending">Belum bayar</option>
          <option value="paid">Lunas</option>
          <option value="cancelled">Dibatalkan</option>
        </select>

        <input
          type="date"
          value={date}
          onChange={(event) => handleDateChange(event.target.value)}
          className={cn(SELECT_CLASSES, "text-muted-foreground")}
          aria-label="Filter tanggal"
        />

        {(status || date) && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
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
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <span className="text-sm text-muted-foreground">
            Halaman {meta.current_page} dari {meta.last_page} &middot; {meta.total} pesanan
          </span>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  text="Sebelumnya"
                  aria-disabled={page <= 1}
                  className={cn(page <= 1 && "pointer-events-none opacity-50")}
                  onClick={(event) => {
                    event.preventDefault()
                    goToPage(page - 1)
                  }}
                />
              </PaginationItem>

              {pageItems(page, meta.last_page).map((item, index) =>
                item === "ellipsis" ? (
                  <PaginationItem key={`gap-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={item}>
                    <PaginationLink
                      href="#"
                      isActive={item === page}
                      onClick={(event) => {
                        event.preventDefault()
                        goToPage(item)
                      }}
                    >
                      {item}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  text="Berikutnya"
                  aria-disabled={page >= meta.last_page}
                  className={cn(page >= meta.last_page && "pointer-events-none opacity-50")}
                  onClick={(event) => {
                    event.preventDefault()
                    goToPage(page + 1)
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}

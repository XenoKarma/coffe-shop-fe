import { useCallback, useEffect, useState } from "react"
import { ChartColumn, Loader2, RefreshCw, TrendingUp, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api, ApiError } from "@/lib/api"
import { formatRupiah } from "@/lib/format"

interface SalesSummary {
  sales: number
  orders: number
}

interface BestSeller {
  product_id: number
  product_name: string
  quantity: number
  sales: number
}

interface SalesReport {
  today: SalesSummary
  month: SalesSummary
  total: SalesSummary
  best_sellers: BestSeller[]
}

export default function ReportsPage() {
  const [report, setReport] = useState<SalesReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback((signal?: AbortSignal) => {
    return api
      .get<{ data: SalesReport }>("/reports/sales", { signal })
      .then((response) => {
        setReport(response.data)
        setError(null)
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status !== 0) {
          setError(err.message)
        }
      })
      .finally(() => {
        setLoading(false)
        setRefreshing(false)
      })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)

    return () => controller.abort()
  }, [load])

  function handleRefresh() {
    setRefreshing(true)
    void load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
        <Loader2 className="animate-spin" />
        Memuat laporan...
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error ?? "Gagal memuat laporan."}
      </div>
    )
  }

  const cards = [
    { label: "Hari Ini", summary: report.today, icon: TrendingUp },
    { label: "Bulan Ini", summary: report.month, icon: ChartColumn },
    { label: "Total Sepanjang Masa", summary: report.total, icon: Users },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-lg font-semibold text-foreground">Laporan Penjualan</h1>
          <p className="text-sm text-muted-foreground">Hanya pesanan yang sudah dibayar (omzet kotor)</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          Muat ulang
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <card.icon className="size-3.5" />
              {card.label}
            </div>
            <p className="text-xl font-semibold text-foreground">{formatRupiah(card.summary.sales)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{card.summary.orders} pesanan</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Menu Terlaris</h2>
          <p className="text-xs text-muted-foreground">Berdasarkan jumlah terjual, pesanan lunas</p>
        </div>

        {report.best_sellers.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Belum ada penjualan.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="w-10 px-4 py-2.5 text-center font-medium">#</th>
                  <th className="px-4 py-2.5 font-medium">Produk</th>
                  <th className="px-4 py-2.5 text-right font-medium">Terjual</th>
                  <th className="px-4 py-2.5 text-right font-medium">Omzet</th>
                </tr>
              </thead>
              <tbody>
                {report.best_sellers.map((item, index) => (
                  <tr key={item.product_id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-center font-medium text-muted-foreground">{index + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{item.product_name}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{item.quantity}</td>
                    <td className="px-4 py-2.5 text-right text-foreground">{formatRupiah(item.sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

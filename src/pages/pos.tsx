import { useCallback, useEffect, useState, type FormEvent } from "react"
import {
  Banknote,
  CircleCheckBig,
  Coffee,
  Loader2,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, ApiError } from "@/lib/api"
import { formatRupiah } from "@/lib/format"
import type { Order, PageMeta, Product } from "@/lib/types"
import { cn } from "cn"

interface ProductIndexResponse {
  data: Product[]
  meta: PageMeta
}

interface CartLine {
  product: Product
  qty: number
}

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [meta, setMeta] = useState<PageMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [productsError, setProductsError] = useState<string | null>(null)

  const [lines, setLines] = useState<CartLine[]>([])
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null)
  const [paidResult, setPaidResult] = useState<Order | null>(null)
  const [received, setReceived] = useState("")

  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  const fetchPage = useCallback((pageToFetch: number, append: boolean, signal?: AbortSignal) => {
    return api
      .get<ProductIndexResponse>(`/products?is_active=1&page=${pageToFetch}`, { signal })
      .then((response) => {
        setProducts((current) => (append ? [...current, ...response.data] : response.data))
        setMeta(response.meta)
        setProductsError(null)
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status !== 0) {
          setProductsError(err.message)
        }
      })
      .finally(() => {
        setLoading(false)
        setLoadingMore(false)
      })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void fetchPage(1, false, controller.signal)

    return () => controller.abort()
  }, [fetchPage])

  const total = lines.reduce((sum, line) => sum + line.product.price * line.qty, 0)
  const locked = pendingOrder !== null || paidResult !== null
  const receivedAmount = Number(received) || 0
  const changePreview = receivedAmount - total

  function handleLoadMore() {
    if (!meta) return
    setLoadingMore(true)
    void fetchPage(meta.current_page + 1, true)
  }

  function addToCart(product: Product) {
    if (locked) return

    setCreateError(null)
    setLines((current) => {
      const existing = current.find((line) => line.product.id === product.id)

      if (existing) {
        return current.map((line) =>
          line.product.id === product.id ? { ...line, qty: line.qty + 1 } : line,
        )
      }

      return [...current, { product, qty: 1 }]
    })
  }

  function changeQty(productId: number, delta: number) {
    if (locked) return

    setLines((current) =>
      current.flatMap((line) => {
        if (line.product.id !== productId) return [line]

        const nextQty = line.qty + delta
        return nextQty <= 0 ? [] : [{ ...line, qty: nextQty }]
      }),
    )
  }

  function removeLine(productId: number) {
    if (locked) return
    setLines((current) => current.filter((line) => line.product.id !== productId))
  }

  async function handleCheckout() {
    if (lines.length === 0) return

    setCreating(true)
    setCreateError(null)

    try {
      const response = await api.post<{ data: Order }>("/orders", {
        body: {
          items: lines.map((line) => ({ product_id: line.product.id, quantity: line.qty })),
        },
      })

      setPendingOrder(response.data)
      setReceived("")
    } catch (err) {
      if (err instanceof ApiError) {
        setCreateError(err.errors.items?.[0] ?? err.message)
      } else {
        setCreateError("Terjadi kesalahan tak terduga.")
      }
    } finally {
      setCreating(false)
    }
  }

  async function handlePay(event: FormEvent<HTMLFormElement>) {
    if (!pendingOrder) return

    event.preventDefault()
    setPaying(true)
    setPayError(null)

    try {
      const response = await api.patch<{ data: Order }>(`/orders/${pendingOrder.id}/pay`, {
        body: { paid_amount: receivedAmount },
      })

      setPaidResult(response.data)
    } catch (err) {
      setPayError(err instanceof ApiError ? err.message : "Pembayaran gagal.")
    } finally {
      setPaying(false)
    }
  }

  function resetTransaction() {
    setPaidResult(null)
    setPendingOrder(null)
    setLines([])
    setReceived("")
    setCreateError(null)
    setPayError(null)
  }

  const quickAmounts = [total, 50000, 100000, 200000]

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_380px]">
      <section>
        <div className="mb-3">
          <h1 className="font-heading text-lg font-semibold text-foreground">Pilih Menu</h1>
          <p className="text-sm text-muted-foreground">Klik produk untuk menambah ke pesanan</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-10 text-sm text-muted-foreground">
            <Loader2 className="animate-spin" />
            Memuat menu...
          </div>
        ) : productsError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {productsError}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  disabled={locked}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 text-left shadow-sm transition hover:border-primary/50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      className="aspect-square w-full rounded-lg border border-border object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-border bg-muted">
                      <Coffee className="size-6 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                    <p className="text-sm font-semibold text-primary">{formatRupiah(product.price)}</p>
                  </div>
                </button>
              ))}
            </div>

            {meta && meta.current_page < meta.last_page && (
              <div className="mt-4 flex justify-center">
                <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
                  {loadingMore && <Loader2 className="animate-spin" />}
                  Muat menu lainnya ({meta.total - products.length} tersisa)
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <aside className="sticky top-0 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Pesanan</h2>
          {pendingOrder && !paidResult && (
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {pendingOrder.order_number}
            </span>
          )}
        </div>

        {paidResult ? (
          <div className="space-y-4 p-4 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
              <CircleCheckBig className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Transaksi Berhasil</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{paidResult.order_number}</p>
            </div>

            <dl className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total</dt>
                <dd className="font-medium text-foreground">{formatRupiah(paidResult.total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Diterima</dt>
                <dd className="font-medium text-foreground">
                  {formatRupiah(paidResult.payment?.paid_amount ?? 0)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Kembali</dt>
                <dd className="font-semibold text-primary">
                  {formatRupiah(paidResult.payment?.change ?? 0)}
                </dd>
              </div>
            </dl>

            <Button className="w-full" onClick={resetTransaction}>
              <Plus />
              Transaksi Baru
            </Button>
          </div>
        ) : (
          <div className="p-4">
            {lines.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <ShoppingCart className="size-6" />
                Belum ada pesanan. Klik menu di kiri.
              </div>
            ) : (
              <ul className="space-y-3">
                {lines.map((line) => (
                  <li key={line.product.id} className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{line.product.name}</p>
                        <p className="text-xs text-muted-foreground">{formatRupiah(line.product.price)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(line.product.id)}
                        disabled={locked}
                        aria-label={`Hapus ${line.product.name}`}
                        className="text-muted-foreground transition hover:text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon-xs"
                          onClick={() => changeQty(line.product.id, -1)}
                          disabled={locked}
                          aria-label="Kurangi"
                        >
                          <Minus />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium text-foreground">{line.qty}</span>
                        <Button
                          variant="outline"
                          size="icon-xs"
                          onClick={() => changeQty(line.product.id, 1)}
                          disabled={locked}
                          aria-label="Tambah"
                        >
                          <Plus />
                        </Button>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {formatRupiah(line.product.price * line.qty)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-semibold text-foreground">{formatRupiah(total)}</span>
            </div>

            {!pendingOrder ? (
              <div className="mt-3 space-y-2">
                {createError && (
                  <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {createError}
                  </div>
                )}
                <Button className="w-full" onClick={() => void handleCheckout()} disabled={creating || lines.length === 0}>
                  {creating && <Loader2 className="animate-spin" />}
                  Buat &amp; Bayar
                </Button>
              </div>
            ) : (
              <form onSubmit={(event) => void handlePay(event)} className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="received" className="text-sm font-medium text-foreground">
                    Uang diterima
                  </label>
                  <Input
                    id="received"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={received}
                    onChange={(event) => setReceived(event.target.value)}
                    placeholder="0"
                    autoFocus
                    aria-invalid={payError ? true : undefined}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {quickAmounts.map((amount, index) => (
                      <Button
                        key={`${amount}-${index}`}
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => setReceived(String(amount))}
                      >
                        {index === 0 ? "Uang pas" : formatRupiah(amount)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Kembali</span>
                  <span className={cn("font-semibold", changePreview < 0 ? "text-destructive" : "text-primary")}>
                    {changePreview < 0 ? formatRupiah(changePreview) : formatRupiah(Math.max(changePreview, 0))}
                  </span>
                </div>

                {payError && (
                  <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {payError}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={paying || receivedAmount < total}>
                  {paying ? <Loader2 className="animate-spin" /> : <Banknote />}
                  Bayar
                </Button>
              </form>
            )}
          </div>
        )}
      </aside>
    </div>
  )
}

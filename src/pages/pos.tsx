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
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ErrorAlert } from "@/components/error-alert"
import { usePersistedState } from "@/hooks/use-persisted-state"
import { api, ApiError } from "@/lib/api"
import { isCacheFresh, peekCache, writeCache } from "@/lib/cache"
import { formatRupiah } from "@/lib/format"
import type { Order, PageMeta, Product } from "@/lib/types"
import { cn } from "cn"

interface ProductIndexResponse {
  data: Product[]
  meta: PageMeta
}

interface MenuCache {
  products: Product[]
  meta: PageMeta | null
}

interface CartLine {
  product: Product
  qty: number
}

const MENU_CACHE = "pos:menu"

export default function PosPage() {
  const [menuCache] = useState(() => peekCache<MenuCache>(MENU_CACHE))
  const [hadCache] = useState(() => menuCache !== null)
  const [products, setProducts] = useState<Product[]>(() => menuCache?.products ?? [])
  const [meta, setMeta] = useState<PageMeta | null>(() => menuCache?.meta ?? null)
  const [loading, setLoading] = useState(() => menuCache === null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [productsError, setProductsError] = useState<string | null>(null)

  const [lines, setLines] = usePersistedState<CartLine[]>("nara:pos:lines", [])
  const [pendingOrder, setPendingOrder] = usePersistedState<Order | null>("nara:pos:pending", null)
  const [paidResult, setPaidResult] = usePersistedState<Order | null>("nara:pos:paid", null)
  const [received, setReceived] = usePersistedState<string>("nara:pos:received", "")
  const [editing, setEditing] = usePersistedState<boolean>("nara:pos:editing", false)

  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [payDialogOpen, setPayDialogOpen] = useState(false)

  const fetchPage = useCallback(
    (pageToFetch: number, append: boolean, signal?: AbortSignal) => {
      return api
        .get<ProductIndexResponse>(`/products?is_active=1&page=${pageToFetch}`, { signal })
        .then((response) => {
          const base = append ? (peekCache<MenuCache>(MENU_CACHE)?.products ?? []) : []
          const next = append ? [...base, ...response.data] : response.data

          setProducts(next)
          setMeta(response.meta)
          setProductsError(null)
          writeCache(MENU_CACHE, { products: next, meta: response.meta })
        })
        .catch((err: unknown) => {
          if (err instanceof ApiError && err.status !== 0 && !hadCache) {
            setProductsError(err.message)
          }
        })
        .finally(() => {
          setLoading(false)
          setLoadingMore(false)
        })
    },
    [hadCache],
  )

  useEffect(() => {
    if (isCacheFresh(MENU_CACHE)) return

    const controller = new AbortController()
    void fetchPage(1, false, controller.signal)

    return () => controller.abort()
  }, [fetchPage])

  const total = lines.reduce((sum, line) => sum + line.product.price * line.qty, 0)
  const locked = paidResult !== null || (pendingOrder !== null && !editing)
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

  function handlePay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pendingOrder) return

    if (receivedAmount < total) {
      setPayError("Uang diterima belum cukup.")
      return
    }

    setPayDialogOpen(true)
  }

  async function confirmPay() {
    if (!pendingOrder) return

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

  function linesFromOrder(order: Order): CartLine[] {
    return order.items.map((item) => {
      const product = products.find((candidate) => candidate.id === item.product_id)

      return {
        product: product ?? {
          id: item.product_id,
          category_id: 0,
          name: item.product_name,
          sku: "",
          description: null,
          price: item.price,
          image: null,
          is_active: true,
          category: null,
        },
        qty: item.quantity,
      }
    })
  }

  function startEditing() {
    if (!pendingOrder) return

    setLines(linesFromOrder(pendingOrder))
    setEditing(true)
    setCreateError(null)
  }

  function stopEditing() {
    if (pendingOrder) setLines(linesFromOrder(pendingOrder))

    setEditing(false)
    setCreateError(null)
  }

  async function handleSaveChanges() {
    if (!pendingOrder || lines.length === 0) return

    setCreating(true)
    setCreateError(null)

    try {
      const response = await api.put<{ data: Order }>(`/orders/${pendingOrder.id}`, {
        body: {
          items: lines.map((line) => ({ product_id: line.product.id, quantity: line.qty })),
        },
      })

      setPendingOrder(response.data)
      setEditing(false)
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

  function handleCancelOrder() {
    setCancelDialogOpen(true)
  }

  function confirmCancelOrder() {
    if (!pendingOrder) return

    setCancelling(true)

    api
      .patch<{ data: Order }>(`/orders/${pendingOrder.id}/cancel`)
      .then(() => resetTransaction())
      .catch((err: unknown) => {
        const message = err instanceof ApiError ? err.message : "Gagal membatalkan pesanan."

        if (editing) {
          setCreateError(message)
        } else {
          setPayError(message)
        }
      })
      .finally(() => setCancelling(false))
  }

  function resetTransaction() {
    setPaidResult(null)
    setPendingOrder(null)
    setLines([])
    setReceived("")
    setEditing(false)
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
          <ErrorAlert message={productsError} />
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
            <span
              className={
                editing
                  ? "rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600"
                  : "rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground"
              }
            >
              {editing ? `Ubah — ${pendingOrder.order_number}` : pendingOrder.order_number}
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
                {pendingOrder && editing
                  ? "Semua item dihapus. Simpan perubahan atau batalkan pesanan."
                  : "Belum ada pesanan. Klik menu di kiri."}
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
                <ErrorAlert message={createError} />
                <Button className="w-full" onClick={() => void handleCheckout()} disabled={creating || lines.length === 0}>
                  {creating && <Loader2 className="animate-spin" />}
                  Buat &amp; Bayar
                </Button>
              </div>
            ) : editing ? (
              <div className="mt-3 space-y-2">
                <ErrorAlert message={createError} />
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => void handleSaveChanges()}
                    disabled={creating || lines.length === 0}
                  >
                    {creating && <Loader2 className="animate-spin" />}
                    Simpan Perubahan
                  </Button>
                  <Button variant="outline" onClick={stopEditing} disabled={creating}>
                    Kembali
                  </Button>
                </div>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleCancelOrder}
                  disabled={cancelling || creating}
                >
                  {cancelling && <Loader2 className="animate-spin" />}
                  Batalkan Pesanan
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

                <ErrorAlert message={payError} />

                <Button type="submit" className="w-full" disabled={paying || receivedAmount < total}>
                  {paying ? <Loader2 className="animate-spin" /> : <Banknote />}
                  Bayar
                </Button>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={startEditing}
                    disabled={paying || cancelling}
                  >
                    Ubah Pesanan
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1"
                    onClick={handleCancelOrder}
                    disabled={cancelling || paying}
                  >
                    {cancelling && <Loader2 className="animate-spin" />}
                    Batalkan
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </aside>

      <ConfirmDialog
        open={payDialogOpen}
        onOpenChange={setPayDialogOpen}
        title="Konfirmasi pembayaran"
        description={`Bayar pesanan ${pendingOrder?.order_number ?? ""}? Setelah dibayar, pesanan tidak bisa diubah atau dibatalkan.`}
        confirmLabel="Ya, Bayar"
        onConfirm={() => void confirmPay()}
      >
        <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-medium text-foreground">{formatRupiah(total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Uang diterima</span>
            <span className="font-medium text-foreground">{formatRupiah(receivedAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Kembali</span>
            <span className="font-semibold text-primary">{formatRupiah(receivedAmount - total)}</span>
          </div>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Batalkan pesanan?"
        description={`Pesanan ${pendingOrder?.order_number ?? ""} akan ditandai sebagai dibatalkan dan tetap tersimpan di Riwayat.`}
        confirmLabel="Ya, batalkan"
        onConfirm={confirmCancelOrder}
      />
    </div>
  )
}

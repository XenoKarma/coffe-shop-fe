import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, ApiError } from "@/lib/api"
import { formatRupiah } from "@/lib/format"
import type { Category, PageMeta, Product } from "@/lib/types"
import { cn } from "cn"

interface ProductIndexResponse {
  data: Product[]
  meta: PageMeta
}

interface FormState {
  mode: "create" | "edit"
  id: number | null
}

interface FormValues {
  name: string
  sku: string
  description: string
  price: string
  category_id: string
  is_active: boolean
}

const EMPTY_FORM: FormValues = {
  name: "",
  sku: "",
  description: "",
  price: "",
  category_id: "",
  is_active: true,
}

const SELECT_CLASSES =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [meta, setMeta] = useState<PageMeta | null>(null)
  const [categoryOptions, setCategoryOptions] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [isActive, setIsActive] = useState("")
  const [page, setPage] = useState(1)
  const searchTimer = useRef<number | undefined>(undefined)

  const [form, setForm] = useState<FormState | null>(null)
  const [values, setValues] = useState<FormValues>(EMPTY_FORM)
  const [editImage, setEditImage] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(
    (signal?: AbortSignal) => {
      const params = new URLSearchParams()

      if (appliedSearch) params.set("search", appliedSearch)
      if (categoryId) params.set("category_id", categoryId)
      if (isActive) params.set("is_active", isActive)
      if (page > 1) params.set("page", String(page))

      const query = params.toString()

      return api
        .get<ProductIndexResponse>(`/products${query ? `?${query}` : ""}`, { signal })
        .then((response) => {
          setProducts(response.data)
          setMeta(response.meta)
          setListError(null)
        })
        .catch((err: unknown) => {
          if (err instanceof ApiError && err.status !== 0) {
            setListError(err.message)
          }
        })
        .finally(() => {
          setLoading(false)
        })
    },
    [appliedSearch, categoryId, isActive, page],
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)

    return () => controller.abort()
  }, [load])

  useEffect(() => {
    const controller = new AbortController()

    api
      .get<{ data: Category[] }>("/categories", { signal: controller.signal })
      .then((response) => setCategoryOptions(response.data))
      .catch(() => undefined)

    return () => controller.abort()
  }, [])

  useEffect(() => () => window.clearTimeout(searchTimer.current), [])

  function handleSearchChange(value: string) {
    setSearch(value)
    window.clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => {
      setAppliedSearch(value)
      setPage(1)
    }, 300)
  }

  function openCreate() {
    setForm({ mode: "create", id: null })
    setValues({ ...EMPTY_FORM, category_id: categoryOptions[0]?.id.toString() ?? "" })
    setEditImage(null)
    setFile(null)
    setFieldErrors({})
    setFormError(null)
  }

  function openEdit(product: Product) {
    setForm({ mode: "edit", id: product.id })
    setValues({
      name: product.name,
      sku: product.sku,
      description: product.description ?? "",
      price: String(product.price),
      category_id: String(product.category_id),
      is_active: product.is_active,
    })
    setEditImage(product.image)
    setFile(null)
    setFieldErrors({})
    setFormError(null)
  }

  function closeForm() {
    setForm(null)
  }

  function refreshList() {
    if (page === 1) {
      void load()
    } else {
      setPage(1)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!form) return

    event.preventDefault()
    setSaving(true)
    setFieldErrors({})
    setFormError(null)

    const body = new FormData()
    body.append("name", values.name.trim())
    body.append("sku", values.sku.trim())
    body.append("description", values.description.trim())
    body.append("price", values.price)
    body.append("category_id", values.category_id)
    body.append("is_active", values.is_active ? "1" : "0")

    if (file) {
      body.append("image", file)
    }

    try {
      if (form.mode === "create") {
        await api.post("/products", { body })
      } else {
        body.append("_method", "PUT")
        await api.post(`/products/${form.id}`, { body })
      }

      setForm(null)
      refreshList()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422) {
          setFieldErrors(err.errors)
        } else {
          setFormError(err.message)
        }
      } else {
        setFormError("Terjadi kesalahan tak terduga.")
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(product: Product) {
    if (!window.confirm(`Hapus produk "${product.name}"?`)) return

    setDeletingId(product.id)
    setActionError(null)

    try {
      await api.delete(`/products/${product.id}`)
      setProducts((current) => current.filter((item) => item.id !== product.id))
      setMeta((current) => (current ? { ...current, total: current.total - 1 } : current))

      if (products.length === 1 && page > 1) {
        setPage(page - 1)
      }
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Gagal menghapus produk.")
    } finally {
      setDeletingId(null)
    }
  }

  function fieldError(key: string): string | undefined {
    return fieldErrors[key]?.[0]
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-lg font-semibold text-foreground">Produk</h1>
          <p className="text-sm text-muted-foreground">Menu yang dijual beserta harga dan gambar</p>
        </div>
        {!form && (
          <Button onClick={openCreate}>
            <Plus />
            Tambah
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Cari nama atau SKU..."
            className="pl-8"
            aria-label="Cari produk"
          />
        </div>

        <select
          value={categoryId}
          onChange={(event) => {
            setCategoryId(event.target.value)
            setPage(1)
          }}
          className={cn(SELECT_CLASSES, "w-44")}
          aria-label="Filter kategori"
        >
          <option value="">Semua kategori</option>
          {categoryOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          value={isActive}
          onChange={(event) => {
            setIsActive(event.target.value)
            setPage(1)
          }}
          className={cn(SELECT_CLASSES, "w-36")}
          aria-label="Filter status"
        >
          <option value="">Semua status</option>
          <option value="1">Aktif</option>
          <option value="0">Nonaktif</option>
        </select>
      </div>

      {form && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {form.mode === "create" ? "Produk baru" : "Ubah produk"}
            </h2>
            <button type="button" onClick={closeForm} aria-label="Tutup" className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="product-name" className="text-sm font-medium text-foreground">
                Nama
              </label>
              <Input
                id="product-name"
                value={values.name}
                onChange={(event) => setValues((v) => ({ ...v, name: event.target.value }))}
                aria-invalid={fieldError("name") ? true : undefined}
                required
              />
              {fieldError("name") && <p className="text-xs text-destructive">{fieldError("name")}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="product-sku" className="text-sm font-medium text-foreground">
                SKU
              </label>
              <Input
                id="product-sku"
                value={values.sku}
                onChange={(event) => setValues((v) => ({ ...v, sku: event.target.value }))}
                placeholder="cth. COF-LAT"
                aria-invalid={fieldError("sku") ? true : undefined}
                required
              />
              {fieldError("sku") && <p className="text-xs text-destructive">{fieldError("sku")}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="product-price" className="text-sm font-medium text-foreground">
                Harga (Rp)
              </label>
              <Input
                id="product-price"
                type="number"
                min="0"
                value={values.price}
                onChange={(event) => setValues((v) => ({ ...v, price: event.target.value }))}
                aria-invalid={fieldError("price") ? true : undefined}
                required
              />
              {fieldError("price") && <p className="text-xs text-destructive">{fieldError("price")}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="product-category" className="text-sm font-medium text-foreground">
                Kategori
              </label>
              <select
                id="product-category"
                value={values.category_id}
                onChange={(event) => setValues((v) => ({ ...v, category_id: event.target.value }))}
                className={cn(SELECT_CLASSES, "aria-invalid:border-destructive")}
                required
              >
                <option value="" disabled>
                  Pilih kategori
                </option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {fieldError("category_id") && <p className="text-xs text-destructive">{fieldError("category_id")}</p>}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="product-description" className="text-sm font-medium text-foreground">
                Deskripsi <span className="font-normal text-muted-foreground">(opsional)</span>
              </label>
              <Input
                id="product-description"
                value={values.description}
                onChange={(event) => setValues((v) => ({ ...v, description: event.target.value }))}
              />
              {fieldError("description") && <p className="text-xs text-destructive">{fieldError("description")}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="product-image" className="text-sm font-medium text-foreground">
                Gambar <span className="font-normal text-muted-foreground">(jpg/png/webp, maks 2 MB)</span>
              </label>
              <input
                id="product-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted"
              />
              {editImage && !file && (
                <img src={editImage} alt="Gambar saat ini" className="size-16 rounded-md border border-border object-cover" />
              )}
              {file && <p className="text-xs text-muted-foreground">File baru: {file.name}</p>}
              {fieldError("image") && <p className="text-xs text-destructive">{fieldError("image")}</p>}
            </div>

            <div className="flex items-end gap-2 pb-1">
              <input
                id="product-active"
                type="checkbox"
                checked={values.is_active}
                onChange={(event) => setValues((v) => ({ ...v, is_active: event.target.checked }))}
                className="size-4 accent-primary"
              />
              <label htmlFor="product-active" className="text-sm font-medium text-foreground">
                Aktif (ditampilkan ke kasir)
              </label>
            </div>
          </div>

          {formError && (
            <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Simpan
            </Button>
            <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>
              Batal
            </Button>
          </div>
        </form>
      )}

      {actionError && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="animate-spin" />
            Memuat...
          </div>
        ) : listError ? (
          <div className="p-8 text-center text-sm text-destructive">{listError}</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Tidak ada produk yang cocok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="w-14 px-4 py-2.5 font-medium">Gambar</th>
                  <th className="px-4 py-2.5 font-medium">Nama</th>
                  <th className="px-4 py-2.5 font-medium">SKU</th>
                  <th className="px-4 py-2.5 font-medium">Kategori</th>
                  <th className="px-4 py-2.5 text-right font-medium">Harga</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="w-24 px-4 py-2.5 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">
                      {product.image ? (
                        <img src={product.image} alt={product.name} loading="lazy" className="size-9 rounded-md border border-border object-cover" />
                      ) : (
                        <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted">
                          <ImageIcon className="size-4 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{product.name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{product.sku}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{product.category?.name ?? "-"}</td>
                    <td className="px-4 py-2.5 text-right text-foreground">{formatRupiah(product.price)}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          product.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {product.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(product)} aria-label={`Ubah ${product.name}`}>
                          <Pencil />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon-sm"
                          onClick={() => void handleDelete(product)}
                          disabled={deletingId === product.id}
                          aria-label={`Hapus ${product.name}`}
                        >
                          {deletingId === product.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                        </Button>
                      </div>
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
            Halaman {meta.current_page} dari {meta.last_page} &middot; {meta.total} produk
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

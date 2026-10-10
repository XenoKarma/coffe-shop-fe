import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ErrorAlert } from "@/components/error-alert"
import { api, ApiError } from "@/lib/api"
import type { Category } from "@/lib/types"

interface FormState {
  mode: "create" | "edit"
  id: number | null
}

const EMPTY_FORM = { name: "", description: "" }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState | null>(null)
  const [name, setName] = useState(EMPTY_FORM.name)
  const [description, setDescription] = useState(EMPTY_FORM.description)
  const [nameError, setNameError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  const load = useCallback((signal?: AbortSignal) => {
    return api
      .get<{ data: Category[] }>("/categories", { signal })
      .then((response) => {
        setCategories(response.data)
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
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)

    return () => controller.abort()
  }, [load])

  function openCreate() {
    setForm({ mode: "create", id: null })
    setName(EMPTY_FORM.name)
    setDescription(EMPTY_FORM.description)
    setNameError(null)
    setFormError(null)
  }

  function openEdit(category: Category) {
    setForm({ mode: "edit", id: category.id })
    setName(category.name)
    setDescription(category.description ?? "")
    setNameError(null)
    setFormError(null)
  }

  function closeForm() {
    setForm(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!form) return

    event.preventDefault()
    setSaving(true)
    setNameError(null)
    setFormError(null)

    const body = {
      name: name.trim(),
      description: description.trim() === "" ? null : description.trim(),
    }

    try {
      if (form.mode === "create") {
        await api.post("/categories", { body })
      } else {
        await api.put(`/categories/${form.id}`, { body })
      }

      setForm(null)
      await load()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422) {
          setNameError(err.errors.name?.[0] ?? null)
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

  async function handleDelete(category: Category) {
    setDeletingId(category.id)
    setDeleteError(null)

    try {
      await api.delete(`/categories/${category.id}`)
      setCategories((current) => current.filter((item) => item.id !== category.id))
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Gagal menghapus kategori.")
    } finally {
      setDeletingId(null)
    }
  }

  function confirmDelete() {
    if (deleteTarget) void handleDelete(deleteTarget)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-lg font-semibold text-foreground">Kategori</h1>
          <p className="text-sm text-muted-foreground">Kelompokkan menu minuman dan makanan</p>
        </div>
        {!form && (
          <Button onClick={openCreate}>
            <Plus />
            Tambah
          </Button>
        )}
      </div>

      {form && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {form.mode === "create" ? "Kategori baru" : "Ubah kategori"}
            </h2>
            <button type="button" onClick={closeForm} aria-label="Tutup" className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="category-name" className="text-sm font-medium text-foreground">
              Nama
            </label>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="cth. Coffee"
              aria-invalid={nameError ? true : undefined}
              required
            />
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="category-description" className="text-sm font-medium text-foreground">
              Deskripsi <span className="font-normal text-muted-foreground">(opsional)</span>
            </label>
            <Input
              id="category-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="cth. Minuman berbasis kopi"
            />
          </div>

          <ErrorAlert message={formError} />

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

      <ErrorAlert message={deleteError} />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="animate-spin" />
            Memuat...
          </div>
        ) : listError ? (
          <div className="p-8 text-center text-sm text-destructive">{listError}</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Belum ada kategori. Klik "Tambah" untuk membuat yang pertama.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Nama</th>
                  <th className="px-4 py-2.5 font-medium">Deskripsi</th>
                  <th className="w-24 px-4 py-2.5 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-medium text-foreground">{category.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{category.description ?? "-"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(category)} aria-label={`Ubah ${category.name}`}>
                          <Pencil />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon-sm"
                          onClick={() => setDeleteTarget(category)}
                          disabled={deletingId === category.id}
                          aria-label={`Hapus ${category.name}`}
                        >
                          {deletingId === category.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
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

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Hapus kategori?"
        description={`Kategori "${deleteTarget?.name ?? ""}" akan dihapus permanen.`}
        confirmLabel="Hapus"
        onConfirm={confirmDelete}
      />
    </div>
  )
}

import { BarChart3, Coffee, LogOut, Receipt, ShoppingCart, Tags, type LucideIcon } from "lucide-react"
import { NavLink, Outlet, useNavigate } from "react-router"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "cn"

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  roles: readonly ("admin" | "cashier")[]
}

const NAV_ITEMS: NavItem[] = [
  { to: "/categories", label: "Kategori", icon: Tags, roles: ["admin"] },
  { to: "/products", label: "Produk", icon: Coffee, roles: ["admin"] },
  { to: "/pos", label: "POS", icon: ShoppingCart, roles: ["admin", "cashier"] },
  { to: "/orders", label: "Riwayat", icon: Receipt, roles: ["admin", "cashier"] },
  { to: "/reports", label: "Laporan", icon: BarChart3, roles: ["admin"] },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    return null
  }

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role))

  async function handleLogout() {
    await logout()
    navigate("/login", { replace: true })
  }

  return (
    <div className="flex min-h-svh w-full">
      <aside className="flex w-16 shrink-0 flex-col border-r border-border bg-card sm:w-60">
        <div className="flex items-center justify-center gap-2 border-b border-border px-3 py-4 sm:justify-start sm:px-4">
          <Coffee className="size-5 text-primary" />
          <span className="hidden font-heading text-sm font-semibold text-foreground sm:inline">NARA Coffee POS</span>
        </div>

        <nav className="flex-1 space-y-1 p-2 sm:p-3">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition-colors sm:justify-start",
                  isActive
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )
              }
            >
              <item.icon className="size-4 shrink-0" />
              <span className="hidden sm:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-2 sm:p-3">
          <div className="mb-2 hidden px-2 sm:block">
            <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.role}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Keluar"
            className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground sm:justify-start"
          >
            <LogOut className="size-4 shrink-0" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  )
}

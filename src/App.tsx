import { BrowserRouter, Navigate, Route, Routes } from "react-router"
import AppLayout from "@/components/layout"
import RequireAuth from "@/components/require-auth"
import RequireRole from "@/components/require-role"
import { AuthProvider } from "@/contexts/auth"
import { useAuth } from "@/contexts/auth-context"
import CategoriesPage from "@/pages/categories"
import LoginPage from "@/pages/login"
import OrderDetailPage from "@/pages/order-detail"
import OrdersPage from "@/pages/orders"
import PosPage from "@/pages/pos"
import ProductsPage from "@/pages/products"
import ReportsPage from "@/pages/reports"

function RoleRedirect() {
  const { user } = useAuth()

  return <Navigate to={user?.role === "admin" ? "/categories" : "/pos"} replace />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<RoleRedirect />} />
              <Route
                path="/categories"
                element={
                  <RequireRole role="admin">
                    <CategoriesPage />
                  </RequireRole>
                }
              />
              <Route
                path="/products"
                element={
                  <RequireRole role="admin">
                    <ProductsPage />
                  </RequireRole>
                }
              />
              <Route path="/pos" element={<PosPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:orderId" element={<OrderDetailPage />} />
              <Route
                path="/reports"
                element={
                  <RequireRole role="admin">
                    <ReportsPage />
                  </RequireRole>
                }
              />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

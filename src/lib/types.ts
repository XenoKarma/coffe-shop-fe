import type { User } from "@/lib/api"

export interface Category {
  id: number
  name: string
  description: string | null
}

export interface Product {
  id: number
  category_id: number
  name: string
  sku: string
  description: string | null
  price: number
  image: string | null
  is_active: boolean
  category: Category | null
}

export interface PageMeta {
  current_page: number
  last_page: number
  total: number
}

export interface OrderPayment {
  id: number
  method: string
  paid_amount: number
  change: number
  paid_at: string | null
}

export interface OrderItem {
  id: number
  product_id: number
  product_name: string
  price: number
  quantity: number
  subtotal: number
}

export interface Order {
  id: number
  order_number: string
  status: "pending" | "paid"
  subtotal: number
  discount: number
  tax: number
  total: number
  cashier: User
  items: OrderItem[]
  payment: OrderPayment | null
  created_at: string
}

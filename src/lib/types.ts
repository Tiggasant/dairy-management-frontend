// Mirrors the backend DTOs (see backend README / dto package).
export type Role = 'OWNER' | 'WORKER'
export type MovementType = 'PURCHASE' | 'SALE' | 'WASTAGE' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT'

export interface User {
  id: number
  username: string
  fullName: string
  role: Role
  active: boolean
  createdAt: string
  lastLoginAt: string | null
}

export interface LoginResponse {
  accessToken: string
  tokenType: string
  expiresInSeconds: number
  user: User
}

export interface Product {
  id: number
  name: string
  category: string
  unit: string
  sellingPrice: number
  active: boolean
  lowStockThreshold: number
}

export interface ProductInput {
  name: string
  category: string
  unit: string
  sellingPrice: number
  lowStockThreshold: number
}

export interface PriceHistory {
  id: number
  productId: number
  sellingPrice: number
  effectiveFrom: string
}

export interface Customer {
  id: number
  name: string
  phone: string | null
  active: boolean
}

export interface CustomerBalance {
  customerId: number
  customerName: string
  totalUdhaar: number
  totalPaid: number
  outstandingBalance: number
}

export interface Payment {
  id: number
  customerId: number
  customerName: string
  amount: number
  paymentDate: string
  notes: string | null
  recordedBy: string
}

export interface SaleHeader {
  id: number
  saleDate: string
  totalAmount: number
  cashAmount: number
  upiAmount: number
  udhaarAmount: number
  customerId: number | null
  customerName: string | null
  createdBy: string
}

export interface SaleItem {
  productId: number
  productName: string
  unit: string
  quantity: number
  sellingPrice: number
  subtotal: number
}

export interface SaleDetail {
  sale: SaleHeader
  items: SaleItem[]
}

export interface SaleRequest {
  items: { productId: number; quantity: number }[]
  cashAmount: number
  upiAmount: number
  udhaarAmount: number
  customerId?: number | null
  clientRequestId: string
}

export interface SalesReport {
  date: string
  totalBills: number
  totalSales: number
  cashCollection: number
  upiCollection: number
  udhaarAmount: number
}

export interface Dashboard {
  todaySales: number
  cashCollection: number
  upiCollection: number
  todayUdhaar: number
  totalBills: number
}

export interface StockRow {
  productId: number
  productName: string
  unit: string
  availableStock: number
  lowStockThreshold: number
  lowStock: boolean
}

export interface StockMovement {
  id: number
  productId: number
  productName: string
  movementType: MovementType
  quantity: number
  createdAt: string
  notes: string | null
  createdBy: string
}

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

import axios, { AxiosError } from 'axios'
import type {
  Customer, CustomerBalance, Dashboard, LoginResponse, MovementType, Page, Payment, PriceHistory,
  Product, ProductInput, Role, SaleDetail, SaleHeader, SaleRequest, SalesReport, StockMovement,
  StockRow, User,
} from './types'

const TOKEN_KEY = 'dairy.token'

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
  },
  set: (t: string) => { try { localStorage.setItem(TOKEN_KEY, t) } catch { /* private mode */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ } },
}

/** Set by AuthProvider: called when the server says the token is no longer valid. */
let onUnauthorized: () => void = () => {}
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn }

const http = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api`,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    const isLogin = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !isLogin) onUnauthorized()
    return Promise.reject(error)
  },
)

/** Human readable message for any failure (backend ApiError, network down, timeout...). */
export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return 'Cannot reach the server. Check your internet connection.'
    const data = err.response.data as { message?: string; fieldErrors?: Record<string, string> } | undefined
    const fields = data?.fieldErrors ? Object.values(data.fieldErrors) : []
    if (fields.length) return fields.join(' · ')
    if (data?.message) return data.message
    return `Request failed (${err.response.status})`
  }
  return err instanceof Error ? err.message : 'Something went wrong'
}

const get = async <T>(url: string, params?: object) => (await http.get<T>(url, { params })).data
const post = async <T>(url: string, body?: unknown) => (await http.post<T>(url, body)).data
const put = async <T>(url: string, body?: unknown) => (await http.put<T>(url, body)).data

export const api = {
  login: (username: string, password: string) => post<LoginResponse>('/auth/login', { username, password }),
  me: () => get<User>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    post<void>('/auth/change-password', { currentPassword, newPassword }),

  // products
  products: () => get<Product[]>('/products'),
  createProduct: (p: ProductInput) => post<Product>('/products', p),
  updateProduct: (id: number, p: ProductInput) => put<Product>(`/products/${id}`, p),
  setProductActive: (id: number, active: boolean) => put<Product>(`/products/${id}/active`, { active }),
  priceHistory: (id: number) => get<PriceHistory[]>(`/products/${id}/price-history`),

  // stock
  stockReport: () => get<StockRow[]>('/stock/report'),
  purchase: (productId: number, quantity: number, notes?: string) =>
    post<StockMovement>('/stock/purchase', { productId, quantity, notes: notes || null }),
  adjust: (productId: number, type: MovementType, quantity: number, notes?: string) =>
    post<StockMovement>('/stock/adjust', { productId, type, quantity, notes: notes || null }),
  movements: (page: number, productId?: number) =>
    get<Page<StockMovement>>('/stock/movements', { page, size: 20, productId }),

  // customers
  customers: () => get<Customer[]>('/customers'),
  createCustomer: (name: string, phone: string) => post<Customer>('/customers', { name, phone }),
  updateCustomer: (id: number, name: string, phone: string) => put<Customer>(`/customers/${id}`, { name, phone }),
  setCustomerActive: (id: number, active: boolean) => put<Customer>(`/customers/${id}/active`, { active }),
  customerBalance: (id: number) => get<CustomerBalance>(`/customers/${id}/balance`),
  outstandingBalances: () => get<CustomerBalance[]>('/customers/balances'),
  payments: (customerId: number) => get<Payment[]>(`/customer-payments/${customerId}`),
  addPayment: (customerId: number, amount: number, notes?: string) =>
    post<Payment>(`/customer-payments/${customerId}`, { amount, notes: notes || null }),

  // sales
  createSale: (req: SaleRequest) => post<SaleDetail>('/sales', req),
  sale: (id: number) => get<SaleDetail>(`/sales/${id}`),
  sales: (from: string, to: string, page: number) => get<Page<SaleHeader>>('/sales', { from, to, page, size: 20 }),
  dailyReport: (date?: string) => get<SalesReport>('/sales/reports/daily', { date }),
  myDailyReport: (date?: string) => get<SalesReport>('/sales/reports/my-daily', { date }),
  dashboard: () => get<Dashboard>('/dashboard/daily'),

  // users (owner)
  users: () => get<User[]>('/users'),
  createUser: (u: { username: string; fullName: string; password: string; role: Role }) =>
    post<User>('/users', u),
  setUserActive: (id: number, active: boolean) => put<User>(`/users/${id}/active`, { active }),
  resetUserPassword: (id: number, newPassword: string) => put<void>(`/users/${id}/password`, { newPassword }),
}

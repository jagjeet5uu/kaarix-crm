import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor - attach JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor - handle 401, refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const res = await axios.post(`${API_BASE}/api/auth/token/refresh/`, { refresh })
          localStorage.setItem('access_token', res.data.access)
          original.headers.Authorization = `Bearer ${res.data.access}`
          return api(original)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (data: { username: string; password: string }) => api.post('/auth/login/', data),
  logout: () => api.post('/auth/logout/'),
  me: () => api.get('/auth/me/'),
}

export const customersAPI = {
  list: (params?: Record<string, unknown>) => api.get('/customers/', { params }),
  create: (data: Record<string, unknown>) => api.post('/customers/', data),
  get: (id: number) => api.get(`/customers/${id}/`),
  update: (id: number, data: Record<string, unknown>) => api.patch(`/customers/${id}/`, data),
  leads: (id: number) => api.get(`/customers/${id}/leads/`),
  reservations: (id: number) => api.get(`/customers/${id}/reservations/`),
  quotations: (id: number) => api.get(`/customers/${id}/quotations/`),
  afterSales: (id: number) => api.get(`/customers/${id}/after-sales/`),
}

export const leadsAPI = {
  list: (params?: Record<string, unknown>) => api.get('/leads/', { params }),
  create: (data: Record<string, unknown>) => api.post('/leads/', data),
  get: (id: number) => api.get(`/leads/${id}/`),
  update: (id: number, data: Record<string, unknown>) => api.patch(`/leads/${id}/`, data),
  activities: (id: number) => api.get(`/leads/${id}/activities/`),
  addActivity: (id: number, data: Record<string, unknown>) => api.post(`/leads/${id}/activities/`, data),
  closeWon: (id: number, data?: Record<string, unknown>) => api.post(`/leads/${id}/close_won/`, data),
  closeLost: (id: number, data: Record<string, unknown>) => api.post(`/leads/${id}/close_lost/`, data),
  changeStage: (id: number, stage: string) => api.post(`/leads/${id}/change_stage/`, { stage }),
  followUpsToday: () => api.get('/leads/follow_ups_today/'),
  overdueFollowUps: () => api.get('/leads/overdue_follow_ups/'),
}

export const productsAPI = {
  list: (params?: Record<string, unknown>) => api.get('/products/', { params }),
  create: (data: Record<string, unknown>) => api.post('/products/', data),
  get: (id: number) => api.get(`/products/${id}/`),
  update: (id: number, data: Record<string, unknown>) => api.patch(`/products/${id}/`, data),
  importCsv: (formData: FormData) =>
    api.post('/products/import_csv/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadImage: (id: number, formData: FormData) =>
    api.post(`/products/${id}/images/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadCertificate: (id: number, formData: FormData) =>
    api.post(`/products/${id}/certificates/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  available: () => api.get('/products/available/'),
  missingSku: () => api.get('/products/missing_sku/'),
  missingCertification: () => api.get('/products/missing_certification/'),
  repricePreview: (params: { making_pct?: number; gst_pct?: number }) =>
    api.get('/products/reprice/', { params }),
  repriceConfirm: (data: { making_pct?: number; gst_pct?: number }) =>
    api.post('/products/reprice/', data),
}

export const reservationsAPI = {
  list: (params?: Record<string, unknown>) => api.get('/reservations/', { params }),
  create: (data: Record<string, unknown>) => api.post('/reservations/', data),
  get: (id: number) => api.get(`/reservations/${id}/`),
  cancel: (id: number, data?: Record<string, unknown>) => api.post(`/reservations/${id}/cancel/`, data),
  extend: (id: number, data: Record<string, unknown>) => api.post(`/reservations/${id}/extend/`, data),
  convertToSale: (id: number) => api.post(`/reservations/${id}/convert_to_sale/`),
}

export const quotationsAPI = {
  list: (params?: Record<string, unknown>) => api.get('/quotations/', { params }),
  create: (data: Record<string, unknown>) => api.post('/quotations/', data),
  get: (id: number) => api.get(`/quotations/${id}/`),
  update: (id: number, data: Record<string, unknown>) => api.patch(`/quotations/${id}/`, data),
  addItem: (id: number, data: Record<string, unknown>) => api.post(`/quotations/${id}/items/`, data),
  removeItem: (id: number, itemId: number) => api.delete(`/quotations/${id}/items/${itemId}/`),
  convertToEstimate: (id: number) => api.post(`/quotations/${id}/convert_to_zoho_estimate/`),
  convertToInvoice: (id: number) => api.post(`/quotations/${id}/convert_to_zoho_invoice/`),
  attachImage: (id: number, formData: FormData) =>
    api.post(`/quotations/${id}/attach_image/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}

export const reportsAPI = {
  dashboard: () => api.get('/reports/dashboard/'),
  inventorySummary: () => api.get('/reports/inventory-summary/'),
  stockAging: () => api.get('/reports/stock-aging/'),
  leadsByStage: () => api.get('/reports/leads-by-stage/'),
  followUps: () => api.get('/reports/follow-ups/'),
  salespersonPerformance: () => api.get('/reports/salesperson-performance/'),
  financialSummary: () => api.get('/reports/financial-summary/'),
  syncErrors: () => api.get('/reports/sync-errors/'),
  goldPrices: () => api.get('/reports/gold-prices/'),
}

export const zohoAPI = {
  syncItems: () => api.post('/zoho/sync/items/'),
  syncContacts: () => api.post('/zoho/sync/contacts/'),
  syncImages: (params?: { all?: boolean; limit?: number }) =>
    api.post('/zoho/sync/sync_images/', {}, { params }),
  syncLogs: (params?: Record<string, unknown>) => api.get('/zoho/sync-logs/', { params }),
  tokenStatus: () => api.get('/zoho/token_status/'),
  authUrl: () => api.get('/zoho/auth/'),
}

export const afterSalesAPI = {
  list: (params?: Record<string, unknown>) => api.get('/after-sales/', { params }),
  create: (data: Record<string, unknown>) => api.post('/after-sales/', data),
  get: (id: number) => api.get(`/after-sales/${id}/`),
  update: (id: number, data: Record<string, unknown>) => api.patch(`/after-sales/${id}/`, data),
}

export const usersAPI = {
  list: (params?: Record<string, unknown>) => api.get('/users/', { params }),
  create: (data: Record<string, unknown>) => api.post('/users/', data),
  update: (id: number, data: Record<string, unknown>) => api.patch(`/users/${id}/`, data),
}

export const purchasesAPI = {
  vendors: {
    list: (params?: Record<string, unknown>) => api.get('/purchases/vendors/', { params }),
    get: (id: number) => api.get(`/purchases/vendors/${id}/`),
    create: (data: Record<string, unknown>) => api.post('/purchases/vendors/', data),
    update: (id: number, data: Record<string, unknown>) => api.patch(`/purchases/vendors/${id}/`, data),
  },
  expenses: {
    list: (params?: Record<string, unknown>) => api.get('/purchases/expenses/', { params }),
    get: (id: number) => api.get(`/purchases/expenses/${id}/`),
  },
  bills: {
    list: (params?: Record<string, unknown>) => api.get('/purchases/bills/', { params }),
    get: (id: number) => api.get(`/purchases/bills/${id}/`),
  },
}

export const financesAPI = {
  invoices: {
    list: (params?: Record<string, unknown>) => api.get('/finances/invoices/', { params }),
    get: (id: number) => api.get(`/finances/invoices/${id}/`),
  },
  customerPayments: {
    list: (params?: Record<string, unknown>) => api.get('/finances/customer-payments/', { params }),
    get: (id: number) => api.get(`/finances/customer-payments/${id}/`),
  },
  vendorPayments: {
    list: (params?: Record<string, unknown>) => api.get('/finances/vendor-payments/', { params }),
    get: (id: number) => api.get(`/finances/vendor-payments/${id}/`),
  },
  vendorCredits: {
    list: (params?: Record<string, unknown>) => api.get('/finances/vendor-credits/', { params }),
    get: (id: number) => api.get(`/finances/vendor-credits/${id}/`),
  },
  journals: {
    list: (params?: Record<string, unknown>) => api.get('/finances/journals/', { params }),
    get: (id: number) => api.get(`/finances/journals/${id}/`),
  },
  deposits: {
    list: (params?: Record<string, unknown>) => api.get('/finances/deposits/', { params }),
    get: (id: number) => api.get(`/finances/deposits/${id}/`),
  },
}

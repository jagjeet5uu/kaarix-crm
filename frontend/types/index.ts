export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: 'admin' | 'sales_manager' | 'salesperson' | 'inventory_manager' | 'accounts' | 'service_staff'
  mobile: string
  is_active: boolean
}

export interface Customer {
  id: number
  zoho_contact_id?: string
  first_name: string
  last_name: string
  full_name: string
  mobile: string
  email?: string
  city?: string
  address?: string
  customer_type: 'retail' | 'wholesale' | 'vip'
  lead_source?: string
  birthday?: string
  anniversary?: string
  preferred_category?: string
  preferred_metal?: string
  preferred_budget_min?: number
  preferred_budget_max?: number
  ring_size?: string
  bracelet_size?: string
  notes?: string
  created_at: string
}

export interface Lead {
  id: number
  customer: number
  customer_name?: string
  assigned_to?: number
  assigned_to_name?: string
  source?: string
  stage: string
  interested_category?: string
  budget_min?: number
  budget_max?: number
  occasion?: string
  required_date?: string
  follow_up_date?: string
  notes?: string
  lost_reason?: string
  created_at: string
}

export interface LeadActivity {
  id: number
  lead: number
  activity_type: string
  description: string
  created_by_name?: string
  created_at: string
}

export interface Product {
  id: number
  zoho_item_id?: string
  item_name: string
  sku?: string
  description?: string
  category: string
  subcategory?: string
  selling_price?: number
  purchase_price?: number
  gross_weight?: number
  net_weight?: number
  diamond_weight?: number
  metal_type?: string
  metal_purity?: string
  stone_type?: string
  certification_type: string
  certification_number?: string
  inventory_status: 'available' | 'reserved' | 'sold' | 'returned' | 'under_service' | 'archived'
  zoho_status?: string
  date_of_purchase?: string
  is_active: boolean
  primary_image?: string | null
  images?: ProductImage[]
  certificates?: ProductCertificate[]
  created_at: string
  margin?: number
}

export interface ProductImage {
  id: number
  file_url: string
  file_name: string
  is_primary: boolean
}

export interface ProductCertificate {
  id: number
  certificate_type: string
  certificate_number?: string
  file_url: string
}

export interface ProductReservation {
  id: number
  product: number
  product_name?: string
  customer: number
  customer_name?: string
  lead?: number
  reserved_by?: number
  reserved_at: string
  reserved_until: string
  advance_amount?: number
  status: 'active' | 'expired' | 'converted_to_sale' | 'cancelled'
  notes?: string
}

export interface QuotationCustomerDetail {
  id: number
  full_name: string
  mobile?: string
  email?: string
}

export interface Quotation {
  id: number
  quotation_number: string
  customer: number
  customer_name?: string
  customer_detail?: QuotationCustomerDetail
  lead?: number
  status: string
  subtotal: number
  discount: number
  tax: number
  total: number
  notes?: string
  zoho_estimate_id?: string
  zoho_invoice_id?: string
  attached_image?: string | null
  items?: QuotationItem[]
  created_at: string
}

export interface QuotationItem {
  id: number
  product?: number
  item_name: string
  sku?: string
  quantity: number
  unit_price: number
  discount: number
  total: number
}

export interface AfterSalesRequest {
  id: number
  customer: number
  customer_name?: string
  product?: number
  product_name?: string
  request_type: string
  received_date: string
  expected_delivery_date?: string
  status: string
  cost?: number
  notes?: string
}

export interface DashboardStats {
  // Inventory
  total_products: number
  available_products: number
  reserved_products: number
  sold_products: number
  returned_products: number
  inventory_value: number
  // Leads
  total_leads: number
  active_leads: number
  won_this_month: number
  leads_by_stage: Record<string, number>
  follow_ups_due_today: number
  overdue_follow_ups: number
  // Customers
  total_customers: number
  new_customers_month: number
  birthdays_today: number
  // Operations
  reservations_expiring_soon: number
  open_service_requests: number
  ready_for_delivery: number
  overdue_tasks: number
  recent_sync_errors: number
}

export interface SyncLog {
  id: number
  sync_type: string
  status: 'success' | 'failed' | 'partial'
  records_synced: number
  records_failed: number
  error_message?: string
  created_at: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface Vendor {
  id: number
  zoho_contact_id?: string
  name: string
  company_name?: string
  email?: string
  phone?: string
  mobile?: string
  city?: string
  address?: string
  gstin?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Expense {
  id: number
  entry_number?: string
  expense_date: string
  description?: string
  account?: string
  vendor?: number
  vendor_name?: string
  amount: number
  tax_amount: number
  total: number
  reference?: string
  is_billable: boolean
  created_at: string
}

export interface BillItem {
  id: number
  item_name: string
  sku?: string
  description?: string
  quantity: number
  rate: number
  total: number
}

export interface Bill {
  id: number
  bill_number: string
  zoho_bill_id?: string
  vendor?: number
  vendor_name?: string
  bill_date?: string
  due_date?: string
  status: 'draft' | 'open' | 'paid' | 'overdue' | 'void' | 'partially_paid'
  subtotal: number
  tax: number
  total: number
  balance: number
  notes?: string
  items?: BillItem[]
  created_at: string
}

export interface SalesInvoiceItem {
  id: number
  item_name: string
  sku?: string
  quantity: number
  unit_price: number
  discount: number
  total: number
}

export interface SalesInvoice {
  id: number
  invoice_number: string
  customer_name: string
  invoice_date: string
  due_date?: string
  status: 'paid' | 'unpaid' | 'overdue' | 'partially_paid' | 'void' | 'draft'
  total: number
  balance: number
  subtotal?: number
  salesperson?: string
  notes?: string
  items?: SalesInvoiceItem[]
}

export interface CustomerPayment {
  id: number
  payment_number: string
  customer_name: string
  payment_date: string
  mode: string
  amount: number
  unused_amount?: number
  reference_number?: string
  invoice_number?: string
  deposit_to?: string
  description?: string
}

export interface VendorPayment {
  id: number
  payment_number: string
  vendor_name: string
  payment_date: string
  mode: string
  amount: number
  reference_number?: string
  bill_number?: string
  paid_through?: string
  description?: string
}

export interface VendorCredit {
  id: number
  credit_number: string
  vendor_name: string
  credit_date: string
  status: string
  subtotal: number
  total: number
  balance: number
  notes?: string
  associated_bill_number?: string
}

export interface JournalEntry {
  id: number
  journal_number: string
  journal_date: string
  journal_type: string
  status: string
  reference_number?: string
  notes?: string
  total: number
  created_by?: string
}

export interface Deposit {
  id: number
  transaction_date: string
  transaction_type: string
  from_account: string
  to_account: string
  reference?: string
  description?: string
  payment_mode: string
  subtotal: number
  total: number
}

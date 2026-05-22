export const INVENTORY_STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-800',
  reserved: 'bg-amber-100 text-amber-800',
  sold: 'bg-blue-100 text-blue-800',
  returned: 'bg-purple-100 text-purple-800',
  under_service: 'bg-orange-100 text-orange-800',
  archived: 'bg-gray-100 text-gray-800',
}

export const LEAD_STAGE_COLORS: Record<string, string> = {
  new_inquiry: 'bg-gray-100 text-gray-700',
  contacted: 'bg-blue-100 text-blue-700',
  requirement_collected: 'bg-cyan-100 text-cyan-700',
  products_shared: 'bg-indigo-100 text-indigo-700',
  shortlisted: 'bg-violet-100 text-violet-700',
  reserved: 'bg-amber-100 text-amber-700',
  quotation_sent: 'bg-orange-100 text-orange-700',
  advance_paid: 'bg-lime-100 text-lime-700',
  invoice_created: 'bg-teal-100 text-teal-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  closed_won: 'bg-green-100 text-green-800',
  closed_lost: 'bg-red-100 text-red-800',
}

export const LEAD_STAGES = [
  { value: 'new_inquiry', label: 'New Inquiry' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'requirement_collected', label: 'Requirement Collected' },
  { value: 'products_shared', label: 'Products Shared' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'quotation_sent', label: 'Quotation Sent' },
  { value: 'advance_paid', label: 'Advance Paid' },
  { value: 'invoice_created', label: 'Invoice Created' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
]

export const INVENTORY_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'sold', label: 'Sold' },
  { value: 'returned', label: 'Returned' },
  { value: 'under_service', label: 'Under Service' },
  { value: 'archived', label: 'Archived' },
]

export const PRODUCT_CATEGORIES = [
  { value: 'ring', label: 'Ring' },
  { value: 'necklace', label: 'Necklace' },
  { value: 'earring', label: 'Earring' },
  { value: 'bracelet', label: 'Bracelet' },
  { value: 'pendant', label: 'Pendant' },
  { value: 'chain', label: 'Chain' },
  { value: 'bangle', label: 'Bangle' },
  { value: 'anklet', label: 'Anklet' },
  { value: 'brooch', label: 'Brooch' },
  { value: 'other', label: 'Other' },
]

export const METAL_TYPES = [
  { value: 'gold', label: 'Gold' },
  { value: 'silver', label: 'Silver' },
  { value: 'platinum', label: 'Platinum' },
  { value: 'white_gold', label: 'White Gold' },
  { value: 'rose_gold', label: 'Rose Gold' },
]

export const METAL_PURITIES = [
  { value: '18k', label: '18K' },
  { value: '22k', label: '22K' },
  { value: '24k', label: '24K' },
  { value: '925', label: '925 Silver' },
  { value: '950', label: '950 Platinum' },
]

export const CUSTOMER_TYPES = [
  { value: 'retail', label: 'Retail' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'vip', label: 'VIP' },
]

export const LEAD_SOURCES = [
  { value: 'walk_in', label: 'Walk In' },
  { value: 'referral', label: 'Referral' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'website', label: 'Website' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'other', label: 'Other' },
]

export const USER_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'sales_manager', label: 'Sales Manager' },
  { value: 'salesperson', label: 'Salesperson' },
  { value: 'inventory_manager', label: 'Inventory Manager' },
  { value: 'accounts', label: 'Accounts' },
  { value: 'service_staff', label: 'Service Staff' },
]

export const AFTER_SALES_TYPES = [
  { value: 'resize', label: 'Resize' },
  { value: 'repair', label: 'Repair' },
  { value: 'polish', label: 'Polish' },
  { value: 'exchange', label: 'Exchange' },
  { value: 'return', label: 'Return' },
  { value: 'other', label: 'Other' },
]

export const AFTER_SALES_STATUSES = [
  { value: 'received', label: 'Received' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const QUOTATION_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'converted', label: 'Converted' },
]

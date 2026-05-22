import { cn } from '@/lib/utils'
import { INVENTORY_STATUS_COLORS, LEAD_STAGE_COLORS } from '@/lib/constants'

interface StatusBadgeProps {
  status: string
  type?: 'inventory' | 'lead_stage' | 'reservation' | 'quotation' | 'after_sales'
  className?: string
}

const RESERVATION_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
  converted_to_sale: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-gray-100 text-gray-800',
}

const QUOTATION_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  converted: 'bg-purple-100 text-purple-800',
}

const AFTER_SALES_STATUS_COLORS: Record<string, string> = {
  received: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  ready: 'bg-amber-100 text-amber-700',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

function formatLabel(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function StatusBadge({ status, type = 'inventory', className }: StatusBadgeProps) {
  let colorClass = ''

  switch (type) {
    case 'inventory':
      colorClass = INVENTORY_STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'
      break
    case 'lead_stage':
      colorClass = LEAD_STAGE_COLORS[status] || 'bg-gray-100 text-gray-700'
      break
    case 'reservation':
      colorClass = RESERVATION_STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'
      break
    case 'quotation':
      colorClass = QUOTATION_STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'
      break
    case 'after_sales':
      colorClass = AFTER_SALES_STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'
      break
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colorClass,
        className
      )}
    >
      {formatLabel(status)}
    </span>
  )
}

'use client'

import { memo } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, DollarSign, User } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Lead } from '@/types'
import { cn } from '@/lib/utils'

interface LeadCardProps {
  lead: Lead
}

export const LeadCard = memo(function LeadCard({ lead }: LeadCardProps) {
  const router = useRouter()

  const isOverdue = lead.follow_up_date
    ? new Date(lead.follow_up_date) < new Date()
    : false

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Suppress navigation if a drag just happened on the draggable ancestor
    const dragged = (e.currentTarget.closest('[data-dragging]') as HTMLElement | null)?.dataset.dragging
    if (dragged === 'true') return
    router.push(`/leads/${lead.id}`)
  }

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow cursor-pointer space-y-2 select-none"
    >
      {/* Customer name */}
      <p className="text-sm font-semibold text-gray-900 leading-tight">
        {lead.customer_name || `Customer #${lead.customer}`}
      </p>

      {/* Stage */}
      <StatusBadge status={lead.stage} type="lead_stage" />

      {/* Budget */}
      {(lead.budget_min || lead.budget_max) && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <DollarSign className="h-3 w-3" />
          <span>
            {lead.budget_min && lead.budget_max
              ? `${formatCurrency(lead.budget_min)} – ${formatCurrency(lead.budget_max)}`
              : formatCurrency(lead.budget_min || lead.budget_max)}
          </span>
        </div>
      )}

      {/* Follow-up date */}
      {lead.follow_up_date && (
        <div className={cn('flex items-center gap-1 text-xs', isOverdue ? 'text-red-500' : 'text-gray-500')}>
          <Calendar className="h-3 w-3" />
          <span>{isOverdue ? 'Overdue: ' : ''}{formatDate(lead.follow_up_date)}</span>
        </div>
      )}

      {/* Assigned to */}
      {lead.assigned_to_name && (
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <User className="h-3 w-3" />
          <span>{lead.assigned_to_name}</span>
        </div>
      )}
    </div>
  )
})

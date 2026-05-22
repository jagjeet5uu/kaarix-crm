'use client'

import Link from 'next/link'
import { Clock, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate } from '@/lib/utils'
import { Lead } from '@/types'

interface FollowUpsTodayProps {
  leads?: Lead[]
  isLoading?: boolean
}

export function FollowUpsToday({ leads, isLoading }: FollowUpsTodayProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            Follow-ups Due Today
          </CardTitle>
          <Link href="/leads?filter=follow_up_today" className="text-xs text-amber-600 hover:underline">
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {!leads || leads.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-gray-400 gap-2">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm">No follow-ups due today</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leads.slice(0, 8).map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {lead.customer_name || `Customer #${lead.customer}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {lead.assigned_to_name || 'Unassigned'}
                    {lead.follow_up_date && ` · ${formatDate(lead.follow_up_date)}`}
                  </p>
                </div>
                <StatusBadge status={lead.stage} type="lead_stage" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

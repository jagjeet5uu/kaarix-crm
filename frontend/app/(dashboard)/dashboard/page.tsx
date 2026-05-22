'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { LeadsChart } from '@/components/dashboard/leads-chart'
import { InventoryChart } from '@/components/dashboard/inventory-chart'
import { PageHeader } from '@/components/shared/page-header'
import { useDashboardStats, useInventorySummary } from '@/hooks/use-dashboard'
import { useFollowUpsToday, useOverdueFollowUps } from '@/hooks/use-leads'
import { formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, Phone, ArrowRight, TrendingUp, Calendar } from 'lucide-react'

const STAGE_LABELS: Record<string, string> = {
  new_inquiry: 'New',
  contacted: 'Contacted',
  requirement_collected: 'Req. Collected',
  products_shared: 'Products Shared',
  shortlisted: 'Shortlisted',
  reserved: 'Reserved',
  quotation_sent: 'Quotation Sent',
  advance_paid: 'Advance Paid',
  closed_won: 'Won',
  closed_lost: 'Lost',
}

const STAGE_COLORS: Record<string, string> = {
  new_inquiry: 'bg-gray-100 text-gray-700',
  contacted: 'bg-blue-100 text-blue-700',
  requirement_collected: 'bg-cyan-100 text-cyan-700',
  products_shared: 'bg-indigo-100 text-indigo-700',
  shortlisted: 'bg-violet-100 text-violet-700',
  reserved: 'bg-amber-100 text-amber-700',
  quotation_sent: 'bg-orange-100 text-orange-700',
  advance_paid: 'bg-green-100 text-green-700',
  closed_won: 'bg-emerald-100 text-emerald-700',
  closed_lost: 'bg-red-100 text-red-700',
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: inventory, isLoading: inventoryLoading } = useInventorySummary()

  const { data: overdueLeads = [], isLoading: overdueLoading } = useOverdueFollowUps()
  const { data: todayLeads = [], isLoading: todayLoading } = useFollowUpsToday()

  // Date greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-7">
      <PageHeader
        title={`${greeting} 👋`}
        description="Here's what's happening with your jewelry business today."
      />

      {/* KPI Cards */}
      <KpiCards stats={stats} isLoading={statsLoading} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <LeadsChart data={stats?.leads_by_stage} isLoading={statsLoading} />
        <InventoryChart data={inventory} isLoading={inventoryLoading} />
      </div>

      {/* Follow-ups section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Overdue follow-ups */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <CardTitle className="text-sm font-semibold text-gray-800">
                  Overdue Follow-ups
                  {(stats?.overdue_follow_ups ?? 0) > 0 && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      {stats?.overdue_follow_ups}
                    </span>
                  )}
                </CardTitle>
              </div>
              <Link href="/leads" className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0 flex-1">
            {overdueLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
              </div>
            ) : overdueLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
                <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center mb-2">
                  <AlertTriangle className="h-5 w-5 text-green-400" />
                </div>
                <p className="text-sm font-medium text-gray-500">All caught up!</p>
                <p className="text-xs mt-0.5">No overdue follow-ups</p>
              </div>
            ) : (
              <div className="space-y-2">
                {overdueLeads.map((lead: any) => (
                  <button
                    key={lead.id}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-amber-200 hover:bg-amber-50/50 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-amber-800">
                          {lead.customer_name || `Lead #${lead.id}`}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {lead.follow_up_date && (
                            <span className="flex items-center gap-1 text-xs text-red-500">
                              <Clock className="h-3 w-3" />
                              {formatDate(lead.follow_up_date)}
                            </span>
                          )}
                          {lead.customer_mobile && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Phone className="h-3 w-3" />
                              {lead.customer_mobile}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[lead.stage] || 'bg-gray-100 text-gray-600'}`}>
                        {STAGE_LABELS[lead.stage] || lead.stage}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's follow-ups */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <CardTitle className="text-sm font-semibold text-gray-800">
                  Follow-ups Today
                  {(stats?.follow_ups_due_today ?? 0) > 0 && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      {stats?.follow_ups_due_today}
                    </span>
                  )}
                </CardTitle>
              </div>
              <Link href="/leads" className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0 flex-1">
            {todayLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
              </div>
            ) : todayLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
                <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center mb-2">
                  <Calendar className="h-5 w-5 text-amber-400" />
                </div>
                <p className="text-sm font-medium text-gray-500">Nothing scheduled today</p>
                <p className="text-xs mt-0.5">Check back tomorrow</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayLeads.map((lead: any) => (
                  <button
                    key={lead.id}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-amber-200 hover:bg-amber-50/50 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-amber-800">
                          {lead.customer_name || `Lead #${lead.id}`}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {lead.interested_category && (
                            <span className="text-xs text-gray-500">{lead.interested_category}</span>
                          )}
                          {lead.customer_mobile && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Phone className="h-3 w-3" />
                              {lead.customer_mobile}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[lead.stage] || 'bg-gray-100 text-gray-600'}`}>
                        {STAGE_LABELS[lead.stage] || lead.stage}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-800">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'New Lead', href: '/leads/new', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50 hover:bg-blue-100' },
              { label: 'New Customer', href: '/customers/new', icon: Calendar, color: 'text-green-600', bg: 'bg-green-50 hover:bg-green-100' },
              { label: 'New Quotation', href: '/quotations', icon: Phone, color: 'text-amber-600', bg: 'bg-amber-50 hover:bg-amber-100' },
              { label: 'View Products', href: '/products', icon: AlertTriangle, color: 'text-purple-600', bg: 'bg-purple-50 hover:bg-purple-100' },
            ].map(action => (
              <Link
                key={action.label}
                href={action.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl ${action.bg} transition-colors group`}
              >
                <action.icon className={`h-5 w-5 ${action.color} flex-shrink-0`} />
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{action.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

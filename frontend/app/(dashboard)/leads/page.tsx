'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDebounce } from '@/hooks/use-debounce'
import { LayoutGrid, List, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable, Column } from '@/components/shared/data-table'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { LeadKanban } from '@/components/leads/lead-kanban'
import { useLeads } from '@/hooks/use-leads'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Lead } from '@/types'
import { LEAD_STAGES } from '@/lib/constants'

export default function LeadsPage() {
  const router = useRouter()
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [stage, setStage] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 25

  // Kanban needs all leads — only paginate in list view
  const { data, isLoading } = useLeads({
    search: debouncedSearch,
    stage: stage || undefined,
    ...(view === 'list' ? { page, page_size: PAGE_SIZE } : { page_size: 200 }),
  })

  const leads: Lead[] = data?.results || data || []
  const total = data?.count || leads.length

  const columns: Column<Lead>[] = [
    {
      key: 'customer_name',
      header: 'Customer',
      render: (val) => <span className="font-medium">{String(val || '—')}</span>,
    },
    {
      key: 'stage',
      header: 'Stage',
      render: (val) => <StatusBadge status={String(val)} type="lead_stage" />,
    },
    {
      key: 'interested_category',
      header: 'Category',
      render: (val) => <span className="text-gray-600">{String(val || '—')}</span>,
    },
    {
      key: 'budget_min',
      header: 'Budget',
      render: (_, row) =>
        row.budget_min || row.budget_max ? (
          <span className="text-sm">
            {formatCurrency(row.budget_min)} – {formatCurrency(row.budget_max)}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'assigned_to_name',
      header: 'Assigned To',
      render: (val) => <span className="text-gray-600">{String(val || 'Unassigned')}</span>,
    },
    {
      key: 'follow_up_date',
      header: 'Follow-up',
      render: (val) => {
        if (!val) return <span className="text-gray-400">—</span>
        const isOverdue = new Date(String(val)) < new Date()
        return (
          <span className={isOverdue ? 'text-red-500 font-medium' : 'text-gray-600'}>
            {formatDate(String(val))}
          </span>
        )
      },
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (val) => <span className="text-gray-500">{formatDate(String(val))}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description={`${total} total leads`}
        actions={
          <Button
            onClick={() => router.push('/leads/new')}
            className="bg-amber-600 hover:bg-amber-700 gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Lead</span>
          </Button>
        }
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-[140px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search leads..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <Select value={stage || 'all'} onValueChange={(v) => { setStage(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-36 sm:w-44">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {LEAD_STAGES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div className="ml-auto flex items-center rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
          <button
            onClick={() => setView('kanban')}
            className={`p-2 transition-colors ${
              view === 'kanban' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-2 transition-colors ${
              view === 'list' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {view === 'kanban' ? (
        <LeadKanban leads={leads} isLoading={isLoading} />
      ) : (
        <DataTable
          data={leads}
          columns={columns}
          isLoading={isLoading}
          onRowClick={(row) => router.push(`/leads/${row.id}`)}
          emptyMessage="No leads found"
          pagination={
            data?.count
              ? {
                  page,
                  pageSize: PAGE_SIZE,
                  total: data.count,
                  onPageChange: setPage,
                }
              : undefined
          }
        />
      )}
    </div>
  )
}

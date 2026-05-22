'use client'

import { useState } from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import { Search, BadgePercent } from 'lucide-react'
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
import { useVendorCredits } from '@/hooks/use-finances'
import { formatCurrency, formatDate } from '@/lib/utils'
import { VendorCredit } from '@/types'

const PAGE_SIZE = 20

const CREDIT_STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  closed: 'bg-gray-100 text-gray-600',
  void: 'bg-gray-100 text-gray-400',
  draft: 'bg-gray-100 text-gray-600',
  applied: 'bg-green-100 text-green-700',
}

export default function VendorCreditsPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useVendorCredits({
    search: debouncedSearch || undefined,
    status: status || undefined,
    page,
    page_size: PAGE_SIZE,
  })

  const credits: VendorCredit[] = data?.results || data || []
  const total = data?.count || credits.length

  const columns: Column<VendorCredit>[] = [
    {
      key: 'credit_number',
      header: 'Credit #',
      render: (val) => <span className="font-mono font-medium text-gray-900">{String(val)}</span>,
    },
    {
      key: 'vendor_name',
      header: 'Vendor',
      render: (val) => <span className="font-medium text-gray-900">{String(val || '—')}</span>,
    },
    {
      key: 'credit_date',
      header: 'Date',
      render: (val) => <span className="text-gray-600">{formatDate(String(val))}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            CREDIT_STATUS_COLORS[String(val)] || 'bg-gray-100 text-gray-600'
          }`}
        >
          {String(val).charAt(0).toUpperCase() + String(val).slice(1)}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (val) => <span className="font-medium">{formatCurrency(Number(val))}</span>,
    },
    {
      key: 'balance',
      header: 'Balance',
      render: (val) => (
        <span className={Number(val) > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
          {formatCurrency(Number(val))}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Credits"
        description={`${total} total vendor credits`}
      />

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by credit # or vendor..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="applied">Applied</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="void">Void</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={credits}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No vendor credits found"
        emptyIcon={<BadgePercent className="h-10 w-10" />}
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
    </div>
  )
}

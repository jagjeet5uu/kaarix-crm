'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, FileText } from 'lucide-react'
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
import { useBills } from '@/hooks/use-purchases'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Bill } from '@/types'

const BILL_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  open: 'Open',
  paid: 'Paid',
  overdue: 'Overdue',
  void: 'Void',
  partially_paid: 'Partial',
}

const BILL_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  open: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-gray-100 text-gray-400',
  partially_paid: 'bg-amber-100 text-amber-700',
}

export default function BillsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const { data, isLoading } = useBills({
    search: search || undefined,
    status: status || undefined,
    page,
    page_size: PAGE_SIZE,
  })

  const bills: Bill[] = data?.results || data || []
  const total = data?.count || bills.length

  const columns: Column<Bill>[] = [
    {
      key: 'bill_number',
      header: 'Bill #',
      render: (val) => (
        <span className="font-mono text-sm font-medium text-gray-900">{String(val)}</span>
      ),
    },
    {
      key: 'vendor_name',
      header: 'Vendor',
      render: (val) => <span className="text-gray-800">{String(val || '—')}</span>,
    },
    {
      key: 'bill_date',
      header: 'Bill Date',
      render: (val) => <span className="text-gray-600">{val ? formatDate(String(val)) : '—'}</span>,
    },
    {
      key: 'due_date',
      header: 'Due Date',
      render: (val) => <span className="text-gray-600">{val ? formatDate(String(val)) : '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            BILL_STATUS_COLORS[String(val)] || 'bg-gray-100 text-gray-600'
          }`}
        >
          {BILL_STATUS_LABELS[String(val)] || String(val)}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (val) => (
        <span className="font-semibold text-gray-900">{formatCurrency(val as number)}</span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance Due',
      render: (val) => (
        <span className={`font-medium ${Number(val) > 0 ? 'text-red-600' : 'text-green-600'}`}>
          {formatCurrency(val as number)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bills"
        description={`${total} total bills`}
      />

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by bill # or vendor..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <Select
          value={status || 'all'}
          onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1) }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="partially_paid">Partially Paid</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={bills}
        columns={columns}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/purchases/bills/${row.id}`)}
        emptyMessage="No bills found"
        emptyIcon={<FileText className="h-10 w-10" />}
        pagination={
          data?.count
            ? { page, pageSize: PAGE_SIZE, total: data.count, onPageChange: setPage }
            : undefined
        }
      />
    </div>
  )
}

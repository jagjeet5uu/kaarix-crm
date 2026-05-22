'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDebounce } from '@/hooks/use-debounce'
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
import { useSalesInvoices } from '@/hooks/use-finances'
import { formatCurrency, formatDate } from '@/lib/utils'
import { SalesInvoice } from '@/types'

const PAGE_SIZE = 20

const INVOICE_STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  unpaid: 'bg-blue-100 text-blue-700',
  overdue: 'bg-red-100 text-red-700',
  partially_paid: 'bg-amber-100 text-amber-700',
  void: 'bg-gray-100 text-gray-400',
  draft: 'bg-gray-100 text-gray-600',
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  paid: 'Paid',
  unpaid: 'Unpaid',
  overdue: 'Overdue',
  partially_paid: 'Partially Paid',
  void: 'Void',
  draft: 'Draft',
}

export default function InvoicesPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useSalesInvoices({
    search: debouncedSearch || undefined,
    status: status || undefined,
    page,
    page_size: PAGE_SIZE,
  })

  const invoices: SalesInvoice[] = data?.results || data || []
  const total = data?.count || invoices.length

  const columns: Column<SalesInvoice>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      render: (val) => <span className="font-mono font-medium text-gray-900">{String(val)}</span>,
    },
    {
      key: 'customer_name',
      header: 'Customer',
      render: (val) => <span className="font-medium text-gray-900">{String(val || '—')}</span>,
    },
    {
      key: 'invoice_date',
      header: 'Date',
      render: (val) => <span className="text-gray-600">{formatDate(String(val))}</span>,
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
            INVOICE_STATUS_COLORS[String(val)] || 'bg-gray-100 text-gray-600'
          }`}
        >
          {INVOICE_STATUS_LABELS[String(val)] || String(val)}
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
        title="Sales Invoices"
        description={`${total} total invoices`}
      />

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by invoice # or customer..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="partially_paid">Partially Paid</SelectItem>
            <SelectItem value="void">Void</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={invoices}
        columns={columns}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/finances/invoices/${row.id}`)}
        emptyMessage="No invoices found"
        emptyIcon={<FileText className="h-10 w-10" />}
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

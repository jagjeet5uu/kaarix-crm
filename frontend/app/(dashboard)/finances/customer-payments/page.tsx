'use client'

import { useState } from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import { Search, CreditCard } from 'lucide-react'
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
import { useCustomerPayments } from '@/hooks/use-finances'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CustomerPayment } from '@/types'

const PAGE_SIZE = 20

const PAYMENT_MODE_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  card: 'Card',
  upi: 'UPI',
  other: 'Other',
}

export default function CustomerPaymentsPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [mode, setMode] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useCustomerPayments({
    search: debouncedSearch || undefined,
    mode: mode || undefined,
    page,
    page_size: PAGE_SIZE,
  })

  const payments: CustomerPayment[] = data?.results || data || []
  const total = data?.count || payments.length

  const columns: Column<CustomerPayment>[] = [
    {
      key: 'payment_number',
      header: 'Payment #',
      render: (val) => <span className="font-mono font-medium text-gray-900">{String(val)}</span>,
    },
    {
      key: 'customer_name',
      header: 'Customer',
      render: (val) => <span className="font-medium text-gray-900">{String(val || '—')}</span>,
    },
    {
      key: 'payment_date',
      header: 'Date',
      render: (val) => <span className="text-gray-600">{formatDate(String(val))}</span>,
    },
    {
      key: 'mode',
      header: 'Mode',
      render: (val) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          {PAYMENT_MODE_LABELS[String(val)] || String(val)}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (val) => <span className="font-semibold text-gray-900">{formatCurrency(Number(val))}</span>,
    },
    {
      key: 'invoice_number',
      header: 'Invoice #',
      render: (val) => <span className="font-mono text-gray-600">{String(val || '—')}</span>,
    },
    {
      key: 'reference_number',
      header: 'Reference',
      render: (val) => <span className="text-gray-500">{String(val || '—')}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Payments"
        description={`${total} total payments`}
      />

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by payment # or customer..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <Select value={mode || 'all'} onValueChange={(v) => { setMode(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All modes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modes</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={payments}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No customer payments found"
        emptyIcon={<CreditCard className="h-10 w-10" />}
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

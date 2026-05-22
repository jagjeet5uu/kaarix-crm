'use client'

import { useState } from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import { Search, Landmark } from 'lucide-react'
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
import { useDeposits } from '@/hooks/use-finances'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Deposit } from '@/types'

const PAGE_SIZE = 20

export default function DepositsPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [transactionType, setTransactionType] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useDeposits({
    search: debouncedSearch || undefined,
    transaction_type: transactionType || undefined,
    page,
    page_size: PAGE_SIZE,
  })

  const deposits: Deposit[] = data?.results || data || []
  const total = data?.count || deposits.length

  const columns: Column<Deposit>[] = [
    {
      key: 'transaction_date',
      header: 'Date',
      render: (val) => <span className="text-gray-600">{formatDate(String(val))}</span>,
    },
    {
      key: 'transaction_type',
      header: 'Type',
      render: (val) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          {String(val || '—')}
        </span>
      ),
    },
    {
      key: 'from_account',
      header: 'From Account',
      render: (val) => <span className="font-medium text-gray-900">{String(val || '—')}</span>,
    },
    {
      key: 'to_account',
      header: 'To Account',
      render: (val) => <span className="font-medium text-gray-900">{String(val || '—')}</span>,
    },
    {
      key: 'payment_mode',
      header: 'Mode',
      render: (val) => <span className="text-gray-600">{String(val || '—')}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      render: (val) => <span className="font-semibold text-gray-900">{formatCurrency(Number(val))}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deposits & Fund Transfers"
        description={`${total} total transactions`}
      />

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by account..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <Select value={transactionType || 'all'} onValueChange={(v) => { setTransactionType(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="deposit">Deposit</SelectItem>
            <SelectItem value="fund_transfer">Fund Transfer</SelectItem>
            <SelectItem value="withdrawal">Withdrawal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={deposits}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No deposits or fund transfers found"
        emptyIcon={<Landmark className="h-10 w-10" />}
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

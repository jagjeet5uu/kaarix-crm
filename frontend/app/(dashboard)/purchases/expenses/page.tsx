'use client'

import { useState } from 'react'
import { Search, Receipt } from 'lucide-react'
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
import { useExpenses } from '@/hooks/use-purchases'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Expense } from '@/types'

export default function ExpensesPage() {
  const [search, setSearch] = useState('')
  const [billable, setBillable] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const { data, isLoading } = useExpenses({
    search: search || undefined,
    is_billable: billable === '' ? undefined : billable === 'true',
    page,
    page_size: PAGE_SIZE,
  })

  const expenses: Expense[] = data?.results || data || []
  const total = data?.count || expenses.length

  const columns: Column<Expense>[] = [
    {
      key: 'entry_number',
      header: 'Entry #',
      render: (val) => (
        <span className="font-mono text-sm text-gray-700">{String(val || '—')}</span>
      ),
    },
    {
      key: 'expense_date',
      header: 'Date',
      render: (val) => <span className="text-gray-700">{formatDate(String(val))}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (val) => (
        <span className="text-gray-600 text-sm max-w-xs truncate block">
          {String(val || '—')}
        </span>
      ),
    },
    {
      key: 'account',
      header: 'Account',
      render: (val) => <span className="text-gray-600 text-sm">{String(val || '—')}</span>,
    },
    {
      key: 'vendor_name',
      header: 'Vendor',
      render: (val) => <span className="text-gray-700">{String(val || '—')}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (val) => (
        <span className="font-medium text-gray-900">{formatCurrency(val as number)}</span>
      ),
    },
    {
      key: 'tax_amount',
      header: 'Tax',
      render: (val) => (
        <span className="text-gray-500 text-sm">{formatCurrency(val as number)}</span>
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
      key: 'is_billable',
      header: 'Billable',
      render: (val) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            val ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {val ? 'Billable' : 'Non-billable'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description={`${total} total expenses`}
      />

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search expenses..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <Select
          value={billable || 'all'}
          onValueChange={(v) => { setBillable(v === 'all' ? '' : v); setPage(1) }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Billable</SelectItem>
            <SelectItem value="false">Non-billable</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={expenses}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No expenses found"
        emptyIcon={<Receipt className="h-10 w-10" />}
        pagination={
          data?.count
            ? { page, pageSize: PAGE_SIZE, total: data.count, onPageChange: setPage }
            : undefined
        }
      />
    </div>
  )
}

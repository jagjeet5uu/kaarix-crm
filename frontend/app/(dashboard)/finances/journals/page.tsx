'use client'

import { useState } from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import { Search, BookOpen } from 'lucide-react'
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
import { useJournals } from '@/hooks/use-finances'
import { formatCurrency, formatDate } from '@/lib/utils'
import { JournalEntry } from '@/types'

const PAGE_SIZE = 20

const JOURNAL_STATUS_COLORS: Record<string, string> = {
  published: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  void: 'bg-gray-100 text-gray-400',
}

export default function JournalsPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useJournals({
    search: debouncedSearch || undefined,
    status: status || undefined,
    page,
    page_size: PAGE_SIZE,
  })

  const journals: JournalEntry[] = data?.results || data || []
  const total = data?.count || journals.length

  const columns: Column<JournalEntry>[] = [
    {
      key: 'journal_number',
      header: 'Journal #',
      render: (val) => <span className="font-mono font-medium text-gray-900">{String(val)}</span>,
    },
    {
      key: 'journal_date',
      header: 'Date',
      render: (val) => <span className="text-gray-600">{formatDate(String(val))}</span>,
    },
    {
      key: 'journal_type',
      header: 'Type',
      render: (val) => <span className="text-gray-700">{String(val || '—')}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            JOURNAL_STATUS_COLORS[String(val)] || 'bg-gray-100 text-gray-600'
          }`}
        >
          {String(val).charAt(0).toUpperCase() + String(val).slice(1)}
        </span>
      ),
    },
    {
      key: 'reference_number',
      header: 'Reference',
      render: (val) => <span className="font-mono text-gray-500">{String(val || '—')}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      render: (val) => <span className="font-semibold text-gray-900">{formatCurrency(Number(val))}</span>,
    },
    {
      key: 'created_by',
      header: 'Created By',
      render: (val) => <span className="text-gray-500">{String(val || '—')}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal Entries"
        description={`${total} total journal entries`}
      />

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by journal # or reference..."
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
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={journals}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No journal entries found"
        emptyIcon={<BookOpen className="h-10 w-10" />}
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

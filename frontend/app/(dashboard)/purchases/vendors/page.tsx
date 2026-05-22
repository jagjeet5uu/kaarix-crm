'use client'

import { useState } from 'react'
import { Search, Building2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { DataTable, Column } from '@/components/shared/data-table'
import { PageHeader } from '@/components/shared/page-header'
import { useVendors } from '@/hooks/use-purchases'
import { Vendor } from '@/types'

export default function VendorsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const { data, isLoading } = useVendors({
    search: search || undefined,
    page,
    page_size: PAGE_SIZE,
  })

  const vendors: Vendor[] = data?.results || data || []
  const total = data?.count || vendors.length

  const columns: Column<Vendor>[] = [
    {
      key: 'name',
      header: 'Vendor Name',
      render: (val, row) => (
        <div>
          <p className="font-medium text-gray-900">{String(val)}</p>
          {row.company_name && <p className="text-xs text-gray-500">{row.company_name}</p>}
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (val) => <span className="text-gray-600 text-sm">{String(val || '—')}</span>,
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (_, row) => (
        <span className="font-mono text-sm text-gray-700">
          {row.phone || row.mobile || '—'}
        </span>
      ),
    },
    {
      key: 'city',
      header: 'City',
      render: (val) => <span className="text-gray-600">{String(val || '—')}</span>,
    },
    {
      key: 'gstin',
      header: 'GSTIN',
      render: (val) => (
        <span className="font-mono text-xs text-gray-500">{String(val || '—')}</span>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (val) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            val ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {val ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        description={`${total} total vendors`}
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search vendors..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
      </div>

      <DataTable
        data={vendors}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No vendors found"
        emptyIcon={<Building2 className="h-10 w-10" />}
        pagination={
          data?.count
            ? { page, pageSize: PAGE_SIZE, total: data.count, onPageChange: setPage }
            : undefined
        }
      />
    </div>
  )
}

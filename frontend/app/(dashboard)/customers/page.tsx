'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDebounce } from '@/hooks/use-debounce'
import { Plus, Search, UserCircle } from 'lucide-react'
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
import { useCustomers } from '@/hooks/use-customers'
import { formatDate } from '@/lib/utils'
import { Customer } from '@/types'

const CUSTOMER_TYPE_COLORS: Record<string, string> = {
  retail: 'bg-gray-100 text-gray-700',
  wholesale: 'bg-blue-100 text-blue-700',
  vip: 'bg-amber-100 text-amber-700',
}

export default function CustomersPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [customerType, setCustomerType] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const { data, isLoading } = useCustomers({
    search: debouncedSearch,
    customer_type: customerType || undefined,
    page,
    page_size: PAGE_SIZE,
  })

  const customers: Customer[] = data?.results || data || []
  const total = data?.count || customers.length

  const columns: Column<Customer>[] = [
    {
      key: 'full_name',
      header: 'Name',
      render: (_, row) => (
        <div>
          <p className="font-medium text-gray-900">{row.full_name}</p>
        </div>
      ),
    },
    {
      key: 'mobile',
      header: 'Mobile',
      render: (val) => <span className="font-mono text-sm">{String(val)}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      render: (val) => <span className="text-gray-600">{String(val || '—')}</span>,
    },
    {
      key: 'city',
      header: 'City',
      render: (val) => <span>{String(val || '—')}</span>,
    },
    {
      key: 'customer_type',
      header: 'Type',
      render: (val) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            CUSTOMER_TYPE_COLORS[String(val)] || 'bg-gray-100 text-gray-700'
          }`}
        >
          {String(val).charAt(0).toUpperCase() + String(val).slice(1)}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Joined',
      render: (val) => <span className="text-gray-500">{formatDate(String(val))}</span>,
    },
    {
      key: 'id',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/customers/${row.id}`)
            }}
          >
            View
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description={`${total} total customers`}
        actions={
          <Button
            onClick={() => router.push('/customers/new')}
            className="bg-amber-600 hover:bg-amber-700 gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Customer</span>
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, mobile, email..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <Select value={customerType || 'all'} onValueChange={(v) => { setCustomerType(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-36 sm:w-40">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="retail">Retail</SelectItem>
            <SelectItem value="wholesale">Wholesale</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={customers}
        columns={columns}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/customers/${row.id}`)}
        emptyMessage="No customers found"
        emptyIcon={<UserCircle className="h-10 w-10" />}
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

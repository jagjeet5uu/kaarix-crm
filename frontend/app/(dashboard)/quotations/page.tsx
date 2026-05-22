'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { DataTable, Column } from '@/components/shared/data-table'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { quotationsAPI, customersAPI } from '@/lib/api'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Quotation } from '@/types'
import { QUOTATION_STATUSES } from '@/lib/constants'
import { toast } from 'sonner'

export default function QuotationsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const [showNewModal, setShowNewModal] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: number; full_name: string } | null>(null)

  const { data: customerResults } = useQuery({
    queryKey: ['customers-search', customerSearch],
    queryFn: async () => {
      const res = await customersAPI.list({ search: customerSearch, page_size: 8 })
      return res.data?.results || res.data || []
    },
    enabled: customerSearch.length > 0,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', status, page],
    queryFn: async () => {
      const res = await quotationsAPI.list({
        status: status || undefined,
        page,
        page_size: PAGE_SIZE,
      })
      return res.data
    },
  })

  const { mutate: createQuotation, isPending: creating } = useMutation({
    mutationFn: (data: Record<string, unknown>) => quotationsAPI.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      toast.success('Quotation created')
      setShowNewModal(false)
      setSelectedCustomer(null)
      setCustomerSearch('')
      router.push(`/quotations/${res.data.id}`)
    },
    onError: () => toast.error('Failed to create quotation'),
  })

  const quotations: Quotation[] = data?.results || data || []
  const total = data?.count || quotations.length

  const columns: Column<Quotation>[] = [
    {
      key: 'quotation_number',
      header: 'Quotation #',
      render: (val) => <span className="font-mono font-medium text-sm">{String(val)}</span>,
    },
    {
      key: 'customer_name',
      header: 'Customer',
      render: (val) => <span className="font-medium">{String(val || '—')}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      render: (val) => <span className="font-semibold">{formatCurrency(val as number)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => <StatusBadge status={String(val)} type="quotation" />,
    },
    {
      key: 'zoho_estimate_id',
      header: 'Zoho Estimate',
      render: (val) => val ? (
        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{String(val)}</span>
      ) : (
        <span className="text-gray-400 text-xs">—</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (val) => <span className="text-gray-500">{formatDate(String(val))}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations"
        description={`${total} quotations`}
        actions={
          <Button
            onClick={() => setShowNewModal(true)}
            className="bg-amber-600 hover:bg-amber-700 gap-2"
          >
            <Plus className="h-4 w-4" />
            New Quotation
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {QUOTATION_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={quotations}
        columns={columns}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/quotations/${row.id}`)}
        emptyMessage="No quotations found"
        pagination={
          data?.count
            ? { page, pageSize: PAGE_SIZE, total: data.count, onPageChange: setPage }
            : undefined
        }
      />

      {/* New Quotation Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Quotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Search Customer</Label>
              <Input
                placeholder="Type customer name or mobile..."
                value={customerSearch}
                onChange={(e) => { setCustomerSearch(e.target.value); setSelectedCustomer(null) }}
                autoFocus
              />
            </div>
            {customerResults && customerResults.length > 0 && !selectedCustomer && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {customerResults.map((c: { id: number; full_name: string; mobile: string }) => (
                  <button
                    key={c.id}
                    className="w-full text-left px-4 py-2.5 hover:bg-amber-50 border-b border-gray-100 last:border-0 transition-colors"
                    onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.full_name) }}
                  >
                    <span className="font-medium text-sm">{c.full_name}</span>
                    <span className="text-xs text-gray-500 ml-2">{c.mobile}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedCustomer && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-sm font-medium text-amber-800">{selectedCustomer.full_name}</span>
                <button onClick={() => { setSelectedCustomer(null); setCustomerSearch('') }} className="ml-auto text-gray-400 hover:text-gray-600 text-xs">✕</button>
              </div>
            )}
            {!selectedCustomer && (
              <p className="text-xs text-gray-400">You can also create a quotation without a customer and assign one later.</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowNewModal(false); setCustomerSearch(''); setSelectedCustomer(null) }}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => createQuotation({ status: 'draft' })}
              disabled={creating}
            >
              Skip Customer
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => createQuotation({ status: 'draft', customer: selectedCustomer?.id })}
              disabled={creating || !selectedCustomer}
            >
              {creating ? 'Creating...' : 'Create Quotation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

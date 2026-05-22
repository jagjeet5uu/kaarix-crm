'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DataTable, Column } from '@/components/shared/data-table'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { afterSalesAPI } from '@/lib/api'
import { formatDate, formatCurrency } from '@/lib/utils'
import { AfterSalesRequest } from '@/types'
import { AFTER_SALES_TYPES, AFTER_SALES_STATUSES } from '@/lib/constants'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'

export default function AfterSalesPage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('')
  const [requestType, setRequestType] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const { register, handleSubmit, reset } = useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['after-sales', status, requestType],
    queryFn: async () => {
      const res = await afterSalesAPI.list({
        status: status || undefined,
        request_type: requestType || undefined,
      })
      return res.data
    },
  })

  const { mutate: createRequest, isPending: creating } = useMutation({
    mutationFn: (data: Record<string, unknown>) => afterSalesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['after-sales'] })
      toast.success('After-sales request created')
      reset()
      setShowCreate(false)
    },
    onError: () => toast.error('Failed to create request'),
  })

  const requests: AfterSalesRequest[] = data?.results || data || []

  const columns: Column<AfterSalesRequest>[] = [
    {
      key: 'customer_name',
      header: 'Customer',
      render: (val) => <span className="font-medium">{String(val || '—')}</span>,
    },
    {
      key: 'product_name',
      header: 'Product',
      render: (val) => <span className="text-gray-600">{String(val || '—')}</span>,
    },
    {
      key: 'request_type',
      header: 'Type',
      render: (val) => (
        <span className="capitalize text-sm">
          {String(val).replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => <StatusBadge status={String(val)} type="after_sales" />,
    },
    {
      key: 'received_date',
      header: 'Received',
      render: (val) => formatDate(String(val)),
    },
    {
      key: 'expected_delivery_date',
      header: 'Expected Delivery',
      render: (val) => val ? formatDate(String(val)) : <span className="text-gray-400">—</span>,
    },
    {
      key: 'cost',
      header: 'Cost',
      render: (val) => val ? formatCurrency(val as number) : <span className="text-gray-400">—</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="After Sales"
        description="Service requests and repairs"
        actions={
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-amber-600 hover:bg-amber-700 gap-2"
          >
            <Plus className="h-4 w-4" />
            New Request
          </Button>
        }
      />

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {AFTER_SALES_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={requestType || 'all'} onValueChange={(v) => setRequestType(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {AFTER_SALES_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={requests}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No after-sales requests found"
      />

      {/* Create modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New After-Sales Request</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((data) =>
              createRequest(data as Record<string, unknown>)
            )}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Customer ID *</Label>
                <Input {...register('customer', { required: true })} type="number" placeholder="Customer ID" />
              </div>
              <div className="space-y-1.5">
                <Label>Product ID</Label>
                <Input {...register('product')} type="number" placeholder="Product ID (optional)" />
              </div>
              <div className="space-y-1.5">
                <Label>Request Type *</Label>
                <select
                  {...register('request_type', { required: true })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {AFTER_SALES_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Received Date *</Label>
                <Input {...register('received_date', { required: true })} type="date" />
              </div>
              <div className="space-y-1.5">
                <Label>Expected Delivery</Label>
                <Input {...register('expected_delivery_date')} type="date" />
              </div>
              <div className="space-y-1.5">
                <Label>Cost (₹)</Label>
                <Input {...register('cost')} type="number" placeholder="0" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea {...register('notes')} placeholder="Description of the issue..." className="min-h-[80px]" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="bg-amber-600 hover:bg-amber-700">
                {creating ? 'Creating...' : 'Create Request'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

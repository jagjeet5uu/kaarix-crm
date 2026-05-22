'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable, Column } from '@/components/shared/data-table'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { CreateReservationModal } from '@/components/reservations/create-reservation-modal'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reservationsAPI } from '@/lib/api'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ProductReservation } from '@/types'
import { toast } from 'sonner'

export default function ReservationsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [tab, setTab] = useState('all')

  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['reservations', tab],
    queryFn: async () => {
      const params: Record<string, unknown> = {}
      if (tab === 'active') params.status = 'active'
      if (tab === 'expiring') params.expiring_soon = true
      if (tab === 'expired') params.status = 'expired'
      const res = await reservationsAPI.list(params)
      return res.data
    },
  })

  const { mutate: cancelReservation, isPending: cancelling } = useMutation({
    mutationFn: (id: number) => reservationsAPI.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      toast.success('Reservation cancelled')
      setCancelId(null)
    },
    onError: () => toast.error('Failed to cancel reservation'),
  })

  const { mutate: convertToSale } = useMutation({
    mutationFn: (id: number) => reservationsAPI.convertToSale(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      toast.success('Converted to sale')
    },
    onError: () => toast.error('Failed to convert to sale'),
  })

  const reservations: ProductReservation[] = data?.results || data || []

  const columns: Column<ProductReservation>[] = [
    {
      key: 'product_name',
      header: 'Product',
      render: (val) => <span className="font-medium">{String(val || '—')}</span>,
    },
    {
      key: 'customer_name',
      header: 'Customer',
      render: (val) => <span>{String(val || '—')}</span>,
    },
    {
      key: 'reserved_until',
      header: 'Reserved Until',
      render: (val) => {
        const date = new Date(String(val))
        const isExpiring = date <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        return (
          <span className={isExpiring ? 'text-amber-600 font-medium' : ''}>
            {formatDate(String(val))}
          </span>
        )
      },
    },
    {
      key: 'advance_amount',
      header: 'Advance',
      render: (val) => <span>{formatCurrency(val as number)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => <StatusBadge status={String(val)} type="reservation" />,
    },
    {
      key: 'id',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {row.status === 'active' && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-blue-600 hover:text-blue-800"
                onClick={() => convertToSale(row.id)}
              >
                Convert
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-red-500 hover:text-red-700"
                onClick={() => setCancelId(row.id)}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservations"
        description="Manage product reservations"
        actions={
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-amber-600 hover:bg-amber-700 gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Reservation
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <DataTable
            data={reservations}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="No reservations found"
          />
        </TabsContent>
      </Tabs>

      <CreateReservationModal open={showCreate} onOpenChange={setShowCreate} />

      <ConfirmDialog
        open={cancelId !== null}
        onOpenChange={(open) => !open && setCancelId(null)}
        title="Cancel Reservation"
        description="Are you sure you want to cancel this reservation? This action cannot be undone."
        confirmLabel="Cancel Reservation"
        variant="destructive"
        onConfirm={() => cancelId && cancelReservation(cancelId)}
        isLoading={cancelling}
      />
    </div>
  )
}

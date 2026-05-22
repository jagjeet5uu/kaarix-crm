'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Edit, Phone, Mail, MapPin, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable, Column } from '@/components/shared/data-table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCustomer,
  useCustomerLeads,
  useCustomerReservations,
  useCustomerQuotations,
  useUpdateCustomer,
} from '@/hooks/use-customers'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Lead, ProductReservation, Quotation } from '@/types'

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const customerId = Number(id)
  const [editOpen, setEditOpen] = useState(false)
  const [editData, setEditData] = useState<Record<string, any>>({})

  const { data: customer, isLoading } = useCustomer(customerId)
  const { data: leads } = useCustomerLeads(customerId)
  const { data: reservations } = useCustomerReservations(customerId)
  const { data: quotations } = useCustomerQuotations(customerId)
  const { mutate: updateCustomer, isPending: updating } = useUpdateCustomer(customerId)

  const openEdit = () => {
    setEditData({
      first_name: customer?.first_name || '',
      last_name: customer?.last_name || '',
      mobile: customer?.mobile || '',
      email: customer?.email || '',
      city: customer?.city || '',
      address: customer?.address || '',
      customer_type: customer?.customer_type || 'retail',
      birthday: customer?.birthday || '',
      anniversary: customer?.anniversary || '',
      preferred_category: customer?.preferred_category || '',
      preferred_metal: customer?.preferred_metal || '',
      preferred_budget_min: customer?.preferred_budget_min || '',
      preferred_budget_max: customer?.preferred_budget_max || '',
      ring_size: customer?.ring_size || '',
      bracelet_size: customer?.bracelet_size || '',
      notes: customer?.notes || '',
    })
    setEditOpen(true)
  }

  const handleSave = () => {
    updateCustomer(editData, {
      onSuccess: () => setEditOpen(false),
    })
  }

  const set = (field: string, value: any) =>
    setEditData((prev) => ({ ...prev, [field]: value }))

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    )
  }

  if (!customer) {
    return <div className="text-center py-16 text-gray-400"><p>Customer not found</p></div>
  }

  const CUSTOMER_TYPE_MAP: Record<string, string> = {
    retail: 'Retail', wholesale: 'Wholesale', vip: 'VIP',
  }

  const leadColumns: Column<Lead>[] = [
    { key: 'id', header: '#' },
    { key: 'stage', header: 'Stage', render: (val) => <StatusBadge status={String(val)} type="lead_stage" /> },
    { key: 'interested_category', header: 'Category', render: (val) => String(val || '—') },
    { key: 'budget_min', header: 'Budget', render: (_, row) => row.budget_min || row.budget_max ? `${formatCurrency(row.budget_min)} – ${formatCurrency(row.budget_max)}` : '—' },
    { key: 'follow_up_date', header: 'Follow-up', render: (val) => formatDate(String(val)) },
  ]

  const reservationColumns: Column<ProductReservation>[] = [
    { key: 'product_name', header: 'Product', render: (val) => String(val || '—') },
    { key: 'reserved_until', header: 'Reserved Until', render: (val) => formatDate(String(val)) },
    { key: 'advance_amount', header: 'Advance', render: (val) => formatCurrency(val as number) },
    { key: 'status', header: 'Status', render: (val) => <StatusBadge status={String(val)} type="reservation" /> },
  ]

  const quotationColumns: Column<Quotation>[] = [
    { key: 'quotation_number', header: 'Quotation #' },
    { key: 'total', header: 'Total', render: (val) => formatCurrency(val as number) },
    { key: 'status', header: 'Status', render: (val) => <StatusBadge status={String(val)} type="quotation" /> },
    { key: 'created_at', header: 'Date', render: (val) => formatDate(String(val)) },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title={customer.full_name}
        description={CUSTOMER_TYPE_MAP[customer.customer_type] + ' Customer'}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button variant="outline" onClick={openEdit} className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="leads">Leads {leads?.length ? `(${leads.length})` : ''}</TabsTrigger>
          <TabsTrigger value="reservations">Reservations {reservations?.length ? `(${reservations.length})` : ''}</TabsTrigger>
          <TabsTrigger value="quotations">Quotations {quotations?.length ? `(${quotations.length})` : ''}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Contact Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-gray-400" /><span>{customer.mobile}</span></div>
                {customer.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-gray-400" /><span>{customer.email}</span></div>}
                {customer.city && <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-gray-400" /><span>{customer.city}</span></div>}
                {customer.address && <p className="text-sm text-gray-600 pl-6">{customer.address}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Important Dates</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {customer.birthday && <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-gray-400" /><span className="text-gray-500">Birthday:</span><span>{formatDate(customer.birthday)}</span></div>}
                {customer.anniversary && <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-gray-400" /><span className="text-gray-500">Anniversary:</span><span>{formatDate(customer.anniversary)}</span></div>}
                <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-gray-400" /><span className="text-gray-500">Customer since:</span><span>{formatDate(customer.created_at)}</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Preferences</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Category', value: customer.preferred_category },
                  { label: 'Metal', value: customer.preferred_metal },
                  { label: 'Min Budget', value: customer.preferred_budget_min ? formatCurrency(customer.preferred_budget_min) : null },
                  { label: 'Max Budget', value: customer.preferred_budget_max ? formatCurrency(customer.preferred_budget_max) : null },
                  { label: 'Ring Size', value: customer.ring_size },
                  { label: 'Bracelet Size', value: customer.bracelet_size },
                ].map((item) => item.value && (
                  <div key={item.label}>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="font-medium">{item.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {customer.notes && (
              <Card>
                <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Notes</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-gray-600">{customer.notes}</p></CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          <DataTable data={leads || []} columns={leadColumns} emptyMessage="No leads for this customer" onRowClick={(row) => router.push(`/leads/${row.id}`)} />
        </TabsContent>

        <TabsContent value="reservations" className="mt-4">
          <DataTable data={reservations || []} columns={reservationColumns} emptyMessage="No reservations for this customer" />
        </TabsContent>

        <TabsContent value="quotations" className="mt-4">
          <DataTable data={quotations || []} columns={quotationColumns} emptyMessage="No quotations for this customer" onRowClick={(row) => router.push(`/quotations/${row.id}`)} />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Name + Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input value={editData.first_name || ''} onChange={(e) => set('first_name', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input value={editData.last_name || ''} onChange={(e) => set('last_name', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Mobile *</Label>
                <Input value={editData.mobile || ''} onChange={(e) => set('mobile', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Customer Type</Label>
                <Select value={editData.customer_type || 'retail'} onValueChange={(v) => set('customer_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="wholesale">Wholesale</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={editData.email || ''} onChange={(e) => set('email', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={editData.city || ''} onChange={(e) => set('city', e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Address</Label>
                <Input value={editData.address || ''} onChange={(e) => set('address', e.target.value)} />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Birthday</Label>
                <Input type="date" value={editData.birthday || ''} onChange={(e) => set('birthday', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Anniversary</Label>
                <Input type="date" value={editData.anniversary || ''} onChange={(e) => set('anniversary', e.target.value)} />
              </div>
            </div>

            {/* Preferences */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Preferred Category</Label>
                <Input value={editData.preferred_category || ''} onChange={(e) => set('preferred_category', e.target.value)} placeholder="e.g. Necklaces" />
              </div>
              <div className="space-y-1.5">
                <Label>Preferred Metal</Label>
                <Input value={editData.preferred_metal || ''} onChange={(e) => set('preferred_metal', e.target.value)} placeholder="e.g. Gold" />
              </div>
              <div className="space-y-1.5">
                <Label>Min Budget (₹)</Label>
                <Input type="number" value={editData.preferred_budget_min || ''} onChange={(e) => set('preferred_budget_min', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Max Budget (₹)</Label>
                <Input type="number" value={editData.preferred_budget_max || ''} onChange={(e) => set('preferred_budget_max', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Ring Size</Label>
                <Input value={editData.ring_size || ''} onChange={(e) => set('ring_size', e.target.value)} placeholder="e.g. 16" />
              </div>
              <div className="space-y-1.5">
                <Label>Bracelet Size</Label>
                <Input value={editData.bracelet_size || ''} onChange={(e) => set('bracelet_size', e.target.value)} placeholder="e.g. 18cm" />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={editData.notes || ''}
                onChange={(e) => set('notes', e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updating} className="bg-amber-600 hover:bg-amber-700 text-white">
              {updating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

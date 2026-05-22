'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useBill } from '@/hooks/use-purchases'
import { formatDate, formatCurrency } from '@/lib/utils'
import { BillItem } from '@/types'

const BILL_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  open: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-gray-100 text-gray-400',
  partially_paid: 'bg-amber-100 text-amber-700',
}

const BILL_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  open: 'Open',
  paid: 'Paid',
  overdue: 'Overdue',
  void: 'Void',
  partially_paid: 'Partially Paid',
}

export default function BillDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: bill, isLoading } = useBill(Number(id))

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    )
  }

  if (!bill) {
    return <div className="text-center py-16 text-gray-400"><p>Bill not found</p></div>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={`Bill ${bill.bill_number}`}
        description={bill.vendor_name || 'Vendor Bill'}
        actions={
          <div className="flex gap-2 items-center">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                BILL_STATUS_COLORS[bill.status] || 'bg-gray-100 text-gray-600'
              }`}
            >
              {BILL_STATUS_LABELS[bill.status] || bill.status}
            </span>
            <Button variant="ghost" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Bill Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Bill Number</span>
              <span className="font-mono font-medium">{bill.bill_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Vendor</span>
              <span className="font-medium">{bill.vendor_name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Bill Date</span>
              <span>{bill.bill_date ? formatDate(bill.bill_date) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Due Date</span>
              <span>{bill.due_date ? formatDate(bill.due_date) : '—'}</span>
            </div>
            {bill.zoho_bill_id && (
              <div className="flex justify-between">
                <span className="text-gray-500">Zoho Bill ID</span>
                <span className="font-mono text-xs text-gray-600">{bill.zoho_bill_id}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Amounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatCurrency(bill.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tax</span>
              <span>{formatCurrency(bill.tax)}</span>
            </div>
            <div className="flex justify-between border-t pt-3 font-semibold text-base">
              <span>Total</span>
              <span>{formatCurrency(bill.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Balance Due</span>
              <span className={Number(bill.balance) > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                {formatCurrency(bill.balance)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {bill.items && bill.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">
              Line Items ({bill.items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rate</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bill.items.map((item: BillItem) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{item.item_name}</p>
                        {item.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.sku || '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(item.rate)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {bill.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{bill.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

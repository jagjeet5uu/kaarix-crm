'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useSalesInvoice } from '@/hooks/use-finances'
import { formatDate, formatCurrency } from '@/lib/utils'
import { SalesInvoiceItem } from '@/types'

const INVOICE_STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  unpaid: 'bg-blue-100 text-blue-700',
  overdue: 'bg-red-100 text-red-700',
  partially_paid: 'bg-amber-100 text-amber-700',
  void: 'bg-gray-100 text-gray-400',
  draft: 'bg-gray-100 text-gray-600',
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  paid: 'Paid',
  unpaid: 'Unpaid',
  overdue: 'Overdue',
  partially_paid: 'Partially Paid',
  void: 'Void',
  draft: 'Draft',
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: invoice, isLoading } = useSalesInvoice(Number(id))

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

  if (!invoice) {
    return <div className="text-center py-16 text-gray-400"><p>Invoice not found</p></div>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={`Invoice ${invoice.invoice_number}`}
        description={invoice.customer_name || 'Sales Invoice'}
        actions={
          <div className="flex gap-2 items-center">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                INVOICE_STATUS_COLORS[invoice.status] || 'bg-gray-100 text-gray-600'
              }`}
            >
              {INVOICE_STATUS_LABELS[invoice.status] || invoice.status}
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
            <CardTitle className="text-sm font-semibold text-gray-700">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Invoice Number</span>
              <span className="font-mono font-medium">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Customer</span>
              <span className="font-medium">{invoice.customer_name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Invoice Date</span>
              <span>{invoice.invoice_date ? formatDate(invoice.invoice_date) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Due Date</span>
              <span>{invoice.due_date ? formatDate(invoice.due_date) : '—'}</span>
            </div>
            {invoice.salesperson && (
              <div className="flex justify-between">
                <span className="text-gray-500">Salesperson</span>
                <span>{invoice.salesperson}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Amounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {invoice.subtotal !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-3 font-semibold text-base">
              <span>Total</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Balance Due</span>
              <span className={Number(invoice.balance) > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                {formatCurrency(invoice.balance)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {invoice.items && invoice.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">
              Line Items ({invoice.items.length})
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
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit Price</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Discount</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.items.map((item: SalesInvoiceItem) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{item.item_name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.sku || '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(item.discount)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

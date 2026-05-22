'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { QuotationBuilder } from '@/components/quotations/quotation-builder'
import { useQuery } from '@tanstack/react-query'
import { quotationsAPI } from '@/lib/api'

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const quotationId = Number(id)

  const { data: quotation, isLoading } = useQuery({
    queryKey: ['quotations', quotationId],
    queryFn: async () => {
      const res = await quotationsAPI.get(quotationId)
      return res.data
    },
    enabled: !!quotationId,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!quotation) {
    return <div className="text-center py-16 text-gray-400">Quotation not found</div>
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Quotation Builder"
        actions={
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />
      <QuotationBuilder quotation={quotation} />
    </div>
  )
}

'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { CsvImport } from '@/components/products/csv-import'

export default function ProductImportPage() {
  const router = useRouter()

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Import Products"
        description="Upload a CSV file to bulk-import products into the catalog"
        actions={
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <p className="font-semibold mb-1">CSV Format Requirements</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li>Required columns: <code className="bg-blue-100 px-1 rounded">item_name</code>, <code className="bg-blue-100 px-1 rounded">category</code></li>
          <li>Optional: sku, selling_price, purchase_price, metal_type, metal_purity, gross_weight, net_weight, certification_type</li>
          <li>Date format: YYYY-MM-DD</li>
          <li>Prices in INR (numbers only, no ₹ symbol)</li>
        </ul>
      </div>

      <CsvImport />
    </div>
  )
}

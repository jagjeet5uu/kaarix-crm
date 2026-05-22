'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDebounce } from '@/hooks/use-debounce'
import { LayoutGrid, List, Plus, Upload, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { PageHeader } from '@/components/shared/page-header'
import { ProductGrid } from '@/components/products/product-grid'
import { ProductFiltersPanel, ProductFilters } from '@/components/products/product-filters'
import { DataTable, Column } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { useProducts } from '@/hooks/use-products'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Product } from '@/types'

export default function ProductsPage() {
  const router = useRouter()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [filters, setFilters] = useState<ProductFilters>({})
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 24

  const { data, isLoading } = useProducts({
    search: debouncedSearch,
    category: filters.category,
    inventory_status: filters.inventory_status?.join(','),
    metal_type: filters.metal_type,
    metal_purity: filters.metal_purity,
    min_price: filters.min_price,
    max_price: filters.max_price,
    missing_sku: filters.missing_sku,
    missing_certification: filters.missing_certification,
    page,
    page_size: PAGE_SIZE,
  })

  const products: Product[] = data?.results || data || []
  const total = data?.count || products.length

  const columns: Column<Product>[] = [
    { key: 'sku', header: 'SKU', render: (val) => <span className="font-mono text-xs text-gray-500">{String(val || '—')}</span> },
    { key: 'item_name', header: 'Name', render: (val) => <span className="font-medium text-gray-900">{String(val)}</span> },
    { key: 'category', header: 'Category', render: (val) => <span className="capitalize">{String(val)}</span> },
    { key: 'metal_purity', header: 'Purity', render: (val) => <span>{String(val || '—')}</span> },
    {
      key: 'selling_price',
      header: 'Price',
      render: (val) => <span className="font-semibold">{formatCurrency(val as number)}</span>,
    },
    {
      key: 'inventory_status',
      header: 'Status',
      render: (val) => <StatusBadge status={String(val)} type="inventory" />,
    },
    { key: 'created_at', header: 'Added', render: (val) => formatDate(String(val)) },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Catalog"
        description={`${total} products`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/products/import')}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import CSV</span>
            </Button>
            <Button
              onClick={() => router.push('/products/new')}
              className="bg-amber-600 hover:bg-amber-700 gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Product</span>
            </Button>
          </div>
        }
      />

      <div className="flex gap-6">
        {/* Filters sidebar — desktop only */}
        <div className="hidden lg:block w-56 flex-shrink-0">
          <ProductFiltersPanel filters={filters} onChange={(f) => { setFilters(f); setPage(1) }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Search + view toggle + mobile filter button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile filter sheet trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden flex-shrink-0" aria-label="Open filters">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="px-4 py-4 border-b border-gray-200">
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="overflow-y-auto h-full pb-20">
                  <ProductFiltersPanel filters={filters} onChange={(f) => { setFilters(f); setPage(1) }} className="border-0 rounded-none" />
                </div>
              </SheetContent>
            </Sheet>

            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <div className="ml-auto flex items-center rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
              <button
                onClick={() => setView('grid')}
                className={`p-2 transition-colors ${
                  view === 'grid' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-2 transition-colors ${
                  view === 'list' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {view === 'grid' ? (
            <>
              <ProductGrid products={products} isLoading={isLoading} />
              {data?.count > PAGE_SIZE && (() => {
                const totalPages = Math.ceil(data.count / PAGE_SIZE)
                return (
                  <div className="flex flex-col sm:flex-row items-center gap-2 sm:justify-between pt-2">
                    <p className="text-sm text-gray-500 text-center sm:text-left">
                      Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, data.count)} of {data.count} products
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(1)} disabled={page === 1}>
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="px-3 py-1 text-sm">Page {page} of {totalPages}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })()}
            </>
          ) : (
            <DataTable
              data={products}
              columns={columns}
              isLoading={isLoading}
              onRowClick={(row) => router.push(`/products/${row.id}`)}
              emptyMessage="No products found"
              pagination={
                data?.count
                  ? { page, pageSize: PAGE_SIZE, total: data.count, onPageChange: setPage }
                  : undefined
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}

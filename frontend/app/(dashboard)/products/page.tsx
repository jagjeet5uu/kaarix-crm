'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useDebounce } from '@/hooks/use-debounce'
import { LayoutGrid, List, Plus, Upload, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, SlidersHorizontal, Zap, TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/page-header'
import { GoldPriceTicker } from '@/components/dashboard/gold-price-ticker'
import { ProductGrid } from '@/components/products/product-grid'
import { ProductFiltersPanel, ProductFilters } from '@/components/products/product-filters'
import { DataTable, Column } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { useProducts } from '@/hooks/use-products'
import { productsAPI } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Product } from '@/types'
import { toast } from 'sonner'

function formatINR(val: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val)
}

export default function ProductsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [filters, setFilters] = useState<ProductFilters>({})
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 24

  // ── Reprice dialog state ───────────────────────────────────────────────────
  const [repriceOpen, setRepriceOpen]       = useState(false)
  const [makingPct, setMakingPct]           = useState('0')
  const [gstPct, setGstPct]                 = useState('3')
  const [previewData, setPreviewData]       = useState<any[] | null>(null)
  const [previewing, setPreviewing]         = useState(false)
  const [confirming, setConfirming]         = useState(false)

  const handlePreview = async () => {
    setPreviewing(true)
    setPreviewData(null)
    try {
      const res = await productsAPI.repricePreview({
        making_pct: parseFloat(makingPct) || 0,
        gst_pct: parseFloat(gstPct) || 3,
      })
      setPreviewData(res.data.changes)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to load preview')
    } finally {
      setPreviewing(false)
    }
  }

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      const res = await productsAPI.repriceConfirm({
        making_pct: parseFloat(makingPct) || 0,
        gst_pct: parseFloat(gstPct) || 3,
      })
      toast.success(res.data.message)
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setRepriceOpen(false)
      setPreviewData(null)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to reprice products')
    } finally {
      setConfirming(false)
    }
  }

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
      <GoldPriceTicker />
      <PageHeader
        title="Product Catalog"
        description={`${total} products`}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => { setPreviewData(null); setRepriceOpen(true) }}
              className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Reprice All</span>
            </Button>
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

      {/* ── Reprice All Dialog ──────────────────────────────────────────── */}
      <Dialog open={repriceOpen} onOpenChange={(o) => { setRepriceOpen(o); if (!o) setPreviewData(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-600" />
              Reprice All Products — Today&apos;s Live Gold Rate
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <p className="text-sm text-gray-500">
              This will recalculate and update the <strong>selling price</strong> of all products
              that have a metal purity and net weight set, based on today&apos;s live gold/silver rate.
              Sold products are excluded.
            </p>

            {/* Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Making Charges (%)</label>
                <Input
                  type="number" min="0" max="100" step="0.1"
                  placeholder="e.g. 12"
                  value={makingPct}
                  onChange={(e) => { setMakingPct(e.target.value); setPreviewData(null) }}
                />
                <p className="text-xs text-gray-400">% of metal cost. Products with stored making charges use their own value.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">GST %</label>
                <select
                  value={gstPct}
                  onChange={(e) => { setGstPct(e.target.value); setPreviewData(null) }}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="0">0%</option>
                  <option value="1.5">1.5%</option>
                  <option value="3">3% — Gold/Silver</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                </select>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={previewing}
              className="gap-2 w-full"
            >
              {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {previewing ? 'Loading preview...' : 'Preview Changes'}
            </Button>

            {/* Preview table */}
            {previewData && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">
                    {previewData.length} product{previewData.length !== 1 ? 's' : ''} will be updated
                  </p>
                </div>

                {previewData.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed rounded-xl">
                    No products found with metal purity + net weight set.
                  </div>
                ) : (
                  <div className="border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr className="text-xs text-gray-500 uppercase tracking-wide">
                            <th className="text-left px-3 py-2">Product</th>
                            <th className="text-left px-3 py-2">Purity</th>
                            <th className="text-right px-3 py-2">Weight</th>
                            <th className="text-right px-3 py-2">Rate/g</th>
                            <th className="text-right px-3 py-2">Old Price</th>
                            <th className="text-right px-3 py-2">New Price</th>
                            <th className="text-right px-3 py-2">Change</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {previewData.map((row: any) => {
                            const diff = row.new_price - (row.old_price ?? 0)
                            const up = diff >= 0
                            return (
                              <tr key={row.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2">
                                  <p className="font-medium text-gray-900 truncate max-w-[140px]">{row.item_name}</p>
                                  <p className="text-xs text-gray-400">{row.sku}</p>
                                </td>
                                <td className="px-3 py-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 uppercase">
                                    {row.metal_purity}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-gray-600">{row.net_weight.toFixed(3)}g</td>
                                <td className="px-3 py-2 text-right tabular-nums text-gray-600">₹{Math.round(row.rate).toLocaleString('en-IN')}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-gray-400">
                                  {row.old_price ? formatINR(row.old_price) : '—'}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-900">
                                  {formatINR(row.new_price)}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {row.old_price ? (
                                    <span className={`flex items-center justify-end gap-0.5 text-xs font-medium ${up ? 'text-green-600' : 'text-red-500'}`}>
                                      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                      {up ? '+' : ''}{formatINR(diff)}
                                    </span>
                                  ) : <span className="text-xs text-gray-400">new</span>}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRepriceOpen(false)}>Cancel</Button>
            <Button
              onClick={handleConfirm}
              disabled={confirming || !previewData || previewData.length === 0}
              className="bg-amber-600 hover:bg-amber-700 gap-2"
            >
              {confirming
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating...</>
                : <><Zap className="h-4 w-4" /> Update {previewData?.length ?? 0} Products</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

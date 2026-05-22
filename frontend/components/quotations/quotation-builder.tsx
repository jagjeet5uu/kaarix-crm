'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Trash2, ExternalLink, Search, ChevronDown, ChevronUp, Upload, MessageCircle, Clipboard, Mail, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency } from '@/lib/utils'
import { Quotation, QuotationItem, Product } from '@/types'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { quotationsAPI, productsAPI } from '@/lib/api'
import { useDebounce } from '@/hooks/use-debounce'
import { toast } from 'sonner'

interface QuotationBuilderProps {
  quotation: Quotation
}

// Carat options and their multiplier relative to 24K
const CARAT_OPTIONS = [
  { label: '24K', value: '24K', multiplier: 1 },
  { label: '22K', value: '22K', multiplier: 22 / 24 },
  { label: '18K', value: '18K', multiplier: 18 / 24 },
  { label: '14K', value: '14K', multiplier: 14 / 24 },
  { label: '925 Silver', value: '925_silver', multiplier: null },
  { label: '950 Platinum', value: '950_platinum', multiplier: null },
]

export function QuotationBuilder({ quotation }: QuotationBuilderProps) {
  const queryClient = useQueryClient()

  // ── Gold Rate Reference Card ──────────────────────────────────────────────
  const [showGoldRate, setShowGoldRate] = useState(false)
  const [goldRate24k, setGoldRate24k] = useState('')
  const [silverRate, setSilverRate] = useState('')
  const [platinumRate, setPlatinumRate] = useState('')

  const derived22k = goldRate24k ? Math.round(parseFloat(goldRate24k) * (22 / 24)) : null
  const derived18k = goldRate24k ? Math.round(parseFloat(goldRate24k) * (18 / 24)) : null
  const derived14k = goldRate24k ? Math.round(parseFloat(goldRate24k) * (14 / 24)) : null

  // Helper: get rate for a given carat value from the gold rate card
  const getRateForCarat = (carat: string): string => {
    if (carat === '24K' && goldRate24k) return goldRate24k
    if (carat === '22K' && derived22k !== null) return String(derived22k)
    if (carat === '18K' && derived18k !== null) return String(derived18k)
    if (carat === '14K' && derived14k !== null) return String(derived14k)
    if (carat === '925_silver' && silverRate) return silverRate
    if (carat === '950_platinum' && platinumRate) return platinumRate
    return ''
  }

  // ── New Item state ────────────────────────────────────────────────────────
  const [newItem, setNewItem] = useState({
    item_name: '',
    sku: '',
    quantity: 1,
    unit_price: 0,
    discount: 0,
  })

  // ── Price Breakdown Calculator ────────────────────────────────────────────
  const [breakdown, setBreakdown] = useState({
    carat: '',
    metal_type: 'gold',
    metal_weight: '',
    rate_per_gram: '',
    making_pct: '',
    making_flat: '',
    wastage_pct: '',
    gst_pct: '3',
  })
  const [showBreakdown, setShowBreakdown] = useState(false)

  const metalCost =
    (parseFloat(breakdown.metal_weight) || 0) * (parseFloat(breakdown.rate_per_gram) || 0)
  const makingAmt = breakdown.making_pct
    ? metalCost * (parseFloat(breakdown.making_pct) / 100)
    : parseFloat(breakdown.making_flat) || 0
  const wastageAmt = breakdown.wastage_pct
    ? metalCost * (parseFloat(breakdown.wastage_pct) / 100)
    : 0
  const preTax = metalCost + makingAmt + wastageAmt
  const gstAmt = preTax * ((parseFloat(breakdown.gst_pct) || 0) / 100)
  const computedTotal = preTax + gstAmt

  const applyBreakdown = () => {
    setNewItem({ ...newItem, unit_price: Math.round(computedTotal) })
    setShowBreakdown(false)
  }

  // When carat changes, auto-fill rate from gold rate card
  const handleCaratChange = (carat: string) => {
    const autoRate = getRateForCarat(carat)
    // Determine metal_type for the selected carat
    let metalType = 'gold'
    if (carat === '925_silver') metalType = 'silver'
    if (carat === '950_platinum') metalType = 'platinum'
    setBreakdown((prev) => ({
      ...prev,
      carat,
      metal_type: metalType,
      rate_per_gram: autoRate !== '' ? autoRate : prev.rate_per_gram,
    }))
  }

  // ── Product Image ─────────────────────────────────────────────────────────
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [localAttachedImage, setLocalAttachedImage] = useState<string | null>(
    quotation.attached_image || null
  )

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('image', file)
    setUploadingImage(true)
    try {
      const res = await quotationsAPI.attachImage(quotation.id, formData)
      const url: string = res.data?.attached_image || res.data?.image || ''
      if (url) setLocalAttachedImage(url)
      queryClient.invalidateQueries({ queryKey: ['quotations', quotation.id] })
      toast.success('Image attached')
    } catch {
      toast.error('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  // Derive first product image from items if no attached image
  const firstItemImage: string | null =
    localAttachedImage ||
    quotation.attached_image ||
    null

  // ── Product Search Autocomplete ───────────────────────────────────────────
  const [productSearch, setProductSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const debouncedSearch = useDebounce(productSearch, 300)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: searchResults } = useQuery({
    queryKey: ['products-search', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return []
      const res = await productsAPI.list({
        search: debouncedSearch,
        page_size: 8,
        inventory_status: 'available',
      })
      return res.data?.results || res.data || []
    },
    enabled: debouncedSearch.length >= 2,
  })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectProduct = (product: Product) => {
    setNewItem({
      ...newItem,
      item_name: product.item_name,
      sku: product.sku || '',
      unit_price: product.selling_price ? Number(product.selling_price) : newItem.unit_price,
    })
    setProductSearch(product.item_name)
    setShowDropdown(false)
  }

  // ── Mutations ─────────────────────────────────────────────────────────────
  const { mutate: addItem, isPending: addingItem } = useMutation({
    mutationFn: (data: Record<string, unknown>) => quotationsAPI.addItem(quotation.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations', quotation.id] })
      setNewItem({ item_name: '', sku: '', quantity: 1, unit_price: 0, discount: 0 })
      setProductSearch('')
      toast.success('Item added')
    },
    onError: () => toast.error('Failed to add item'),
  })

  const { mutate: removeItem } = useMutation({
    mutationFn: (itemId: number) => quotationsAPI.removeItem(quotation.id, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations', quotation.id] })
      toast.success('Item removed')
    },
    onError: () => toast.error('Failed to remove item'),
  })

  const { mutate: convertToEstimate, isPending: convertingEstimate } = useMutation({
    mutationFn: () => quotationsAPI.convertToEstimate(quotation.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations', quotation.id] })
      toast.success('Converted to Zoho Estimate')
    },
    onError: () => toast.error('Failed to convert to estimate'),
  })

  const { mutate: convertToInvoice, isPending: convertingInvoice } = useMutation({
    mutationFn: () => quotationsAPI.convertToInvoice(quotation.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations', quotation.id] })
      toast.success('Converted to Zoho Invoice')
    },
    onError: () => toast.error('Failed to convert to invoice'),
  })

  const handleAddItem = () => {
    if (!newItem.item_name) {
      toast.error('Select or type a product name')
      return
    }
    addItem({
      item_name: newItem.item_name,
      sku: newItem.sku || undefined,
      quantity: newItem.quantity,
      unit_price: newItem.unit_price,
      discount: newItem.discount,
    })
    setProductSearch('')
  }

  // ── Send to Customer helpers ──────────────────────────────────────────────
  const customerMobile = quotation.customer_detail?.mobile || ''
  const customerEmail = quotation.customer_detail?.email || ''
  const quotationDate = new Date(quotation.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const buildMessageText = (): string => {
    const itemLines = (quotation.items || [])
      .map(
        (item) =>
          `${item.item_name} - ${item.quantity} × ₹${Number(item.unit_price).toLocaleString('en-IN')} = ₹${Number(item.total).toLocaleString('en-IN')}`
      )
      .join('\n')

    return [
      '*MIRAYA BESPOKE JEWELLERY*',
      `Quotation: ${quotation.quotation_number}`,
      `Date: ${quotationDate}`,
      '',
      '*Items:*',
      itemLines || '(no items)',
      '',
      '*Price Breakdown:*',
      `Subtotal: ₹${Number(quotation.subtotal).toLocaleString('en-IN')}`,
      `Discount: -₹${Number(quotation.discount).toLocaleString('en-IN')}`,
      `Tax: ₹${Number(quotation.tax).toLocaleString('en-IN')}`,
      `*Total: ₹${Number(quotation.total).toLocaleString('en-IN')}*`,
      '',
      'Thank you for your interest! 🙏',
    ].join('\n')
  }

  const handleWhatsApp = () => {
    if (!customerMobile) {
      toast.error('No mobile number for this customer')
      return
    }
    const digits = customerMobile.replace(/\D/g, '')
    const phone = digits.startsWith('91') ? digits : `91${digits}`
    const text = encodeURIComponent(buildMessageText())
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
  }

  const handleCopyClipboard = async () => {
    try {
      await navigator.clipboard.writeText(buildMessageText())
      toast.success('Estimate copied to clipboard')
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleEmail = () => {
    if (!customerEmail) return
    const subject = encodeURIComponent(`Quotation ${quotation.quotation_number} - Miraya Bespoke Jewellery`)
    const body = encodeURIComponent(buildMessageText())
    window.open(`mailto:${customerEmail}?subject=${subject}&body=${body}`, '_blank')
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Quotation #</p>
          <p className="text-lg font-bold text-gray-900">{quotation.quotation_number}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <StatusBadge status={quotation.status} type="quotation" />
          {quotation.zoho_estimate_id && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
              Zoho Estimate: {quotation.zoho_estimate_id}
            </span>
          )}
          {quotation.zoho_invoice_id && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
              Zoho Invoice: {quotation.zoho_invoice_id}
            </span>
          )}
        </div>
      </div>

      {/* Product / Quotation Image */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-amber-600" />
            Quotation Image
          </CardTitle>
        </CardHeader>
        <CardContent>
          {firstItemImage ? (
            <div className="relative group w-full max-w-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={firstItemImage}
                alt="Quotation product"
                className="w-full max-w-xs rounded-lg object-cover border border-gray-200 shadow-sm"
                style={{ maxHeight: 240 }}
              />
              <button
                onClick={() => imageInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity text-white text-xs font-medium gap-1"
              >
                <Upload className="h-4 w-4" />
                Replace Image
              </button>
            </div>
          ) : (
            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 w-full max-w-xs h-32 border-2 border-dashed border-amber-300 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
            >
              <Upload className="h-6 w-6" />
              <span className="text-xs font-medium">Upload Quotation Image</span>
            </button>
          )}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
            disabled={uploadingImage}
          />
          {uploadingImage && (
            <p className="text-xs text-amber-600 mt-2 animate-pulse">Uploading image…</p>
          )}
          {!firstItemImage && (
            <p className="text-xs text-gray-400 mt-2">
              Or attach a product image — it will appear prominently on the quotation.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Gold Rate Reference Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="text-amber-500">✦</span> Today&apos;s Gold Rate
            </CardTitle>
            <button
              onClick={() => setShowGoldRate(!showGoldRate)}
              className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"
            >
              {showGoldRate ? (
                <>Hide <ChevronUp className="h-3 w-3" /></>
              ) : (
                <>Set Rates <ChevronDown className="h-3 w-3" /></>
              )}
            </button>
          </div>
        </CardHeader>
        {showGoldRate && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* 24K — manual entry */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">24K Rate / gram (₹)</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 7200"
                  className="h-9 text-sm"
                  value={goldRate24k}
                  onChange={(e) => setGoldRate24k(e.target.value)}
                />
              </div>
              {/* 22K — auto */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">22K Rate / gram (₹)</label>
                <div className="h-9 rounded-md border border-gray-200 bg-gray-50 px-3 flex items-center text-sm text-gray-700">
                  {derived22k !== null ? `₹${derived22k.toLocaleString('en-IN')}` : <span className="text-gray-400">auto</span>}
                </div>
              </div>
              {/* 18K — auto */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">18K Rate / gram (₹)</label>
                <div className="h-9 rounded-md border border-gray-200 bg-gray-50 px-3 flex items-center text-sm text-gray-700">
                  {derived18k !== null ? `₹${derived18k.toLocaleString('en-IN')}` : <span className="text-gray-400">auto</span>}
                </div>
              </div>
              {/* 14K — auto */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">14K Rate / gram (₹)</label>
                <div className="h-9 rounded-md border border-gray-200 bg-gray-50 px-3 flex items-center text-sm text-gray-700">
                  {derived14k !== null ? `₹${derived14k.toLocaleString('en-IN')}` : <span className="text-gray-400">auto</span>}
                </div>
              </div>
              {/* Silver — manual */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">925 Silver / gram (₹)</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 90"
                  className="h-9 text-sm"
                  value={silverRate}
                  onChange={(e) => setSilverRate(e.target.value)}
                />
              </div>
              {/* Platinum — manual */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">950 Platinum / gram (₹)</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 3200"
                  className="h-9 text-sm"
                  value={platinumRate}
                  onChange={(e) => setPlatinumRate(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">
              22K, 18K, and 14K rates are calculated automatically from the 24K rate. Silver and
              Platinum are entered manually.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Price Breakdown Calculator */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Price Breakdown Calculator</CardTitle>
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="text-xs text-amber-600 hover:text-amber-700 font-medium"
            >
              {showBreakdown ? 'Hide' : 'Show'}
            </button>
          </div>
        </CardHeader>
        {showBreakdown && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Carat */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Carat / Purity</label>
                <select
                  value={breakdown.carat}
                  onChange={(e) => handleCaratChange(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">— Select —</option>
                  {CARAT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {/* Metal type (read-only, driven by carat) */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Metal Type</label>
                <select
                  value={breakdown.metal_type}
                  onChange={(e) => setBreakdown({ ...breakdown, metal_type: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="gold">Gold</option>
                  <option value="silver">Silver</option>
                  <option value="platinum">Platinum</option>
                </select>
              </div>
              {/* Metal weight */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Metal Weight (g)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="e.g. 5.2"
                  className="h-9 text-sm"
                  value={breakdown.metal_weight}
                  onChange={(e) => setBreakdown({ ...breakdown, metal_weight: e.target.value })}
                />
              </div>
              {/* Rate per gram — auto-filled from gold rate card, but editable */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">
                  Rate / gram (₹)
                  {breakdown.carat && getRateForCarat(breakdown.carat) && (
                    <span className="text-amber-500 ml-1 font-normal">(auto)</span>
                  )}
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 6200"
                  className="h-9 text-sm"
                  value={breakdown.rate_per_gram}
                  onChange={(e) => setBreakdown({ ...breakdown, rate_per_gram: e.target.value })}
                />
              </div>
              {/* Making charges % */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Making Charges %</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g. 12"
                  className="h-9 text-sm"
                  value={breakdown.making_pct}
                  onChange={(e) =>
                    setBreakdown({ ...breakdown, making_pct: e.target.value, making_flat: '' })
                  }
                />
              </div>
              {/* Making flat */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Making Charges ₹ (flat)</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="or flat amount"
                  className="h-9 text-sm"
                  value={breakdown.making_flat}
                  onChange={(e) =>
                    setBreakdown({ ...breakdown, making_flat: e.target.value, making_pct: '' })
                  }
                />
              </div>
              {/* Wastage % */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">
                  Wastage % <span className="text-gray-400">(optional)</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g. 4"
                  className="h-9 text-sm"
                  value={breakdown.wastage_pct}
                  onChange={(e) => setBreakdown({ ...breakdown, wastage_pct: e.target.value })}
                />
              </div>
              {/* GST */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">GST %</label>
                <select
                  value={breakdown.gst_pct}
                  onChange={(e) => setBreakdown({ ...breakdown, gst_pct: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="0">0%</option>
                  <option value="1.5">1.5%</option>
                  <option value="3">3% (Gold/Silver)</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                </select>
              </div>
            </div>

            {/* Live summary */}
            <div className="bg-amber-50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between text-gray-600">
                <span>
                  Metal cost ({breakdown.metal_weight || 0}g × ₹{breakdown.rate_per_gram || 0})
                  {breakdown.carat && ` [${breakdown.carat}]`}
                </span>
                <span>{formatCurrency(metalCost)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>
                  Making charges{' '}
                  {breakdown.making_pct ? `(${breakdown.making_pct}%)` : '(flat)'}
                </span>
                <span>{formatCurrency(makingAmt)}</span>
              </div>
              {wastageAmt > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Wastage ({breakdown.wastage_pct}%)</span>
                  <span>{formatCurrency(wastageAmt)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600 border-t border-amber-200 pt-1">
                <span>Pre-tax subtotal</span>
                <span>{formatCurrency(preTax)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST ({breakdown.gst_pct}%)</span>
                <span>{formatCurrency(gstAmt)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 border-t border-amber-200 pt-1">
                <span>Total Price</span>
                <span className="text-amber-700">{formatCurrency(computedTotal)}</span>
              </div>
            </div>

            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 gap-2"
              onClick={applyBreakdown}
              disabled={computedTotal === 0}
            >
              Use ₹{Math.round(computedTotal).toLocaleString('en-IN')} as Unit Price
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Items table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-xs">
                  <th className="text-left pb-2 font-medium">Item</th>
                  <th className="text-left pb-2 font-medium">SKU</th>
                  <th className="text-right pb-2 font-medium">Qty</th>
                  <th className="text-right pb-2 font-medium">Unit Price</th>
                  <th className="text-right pb-2 font-medium">Discount%</th>
                  <th className="text-right pb-2 font-medium">Total</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotation.items?.map((item: QuotationItem) => (
                  <tr key={item.id}>
                    <td className="py-2 font-medium text-gray-900">{item.item_name}</td>
                    <td className="py-2 text-gray-500 font-mono text-xs">{item.sku || '—'}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="py-2 text-right">{item.discount}%</td>
                    <td className="py-2 text-right font-semibold">{formatCurrency(item.total)}</td>
                    <td className="py-2 pl-2">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Add new item row */}
                <tr className="bg-gray-50">
                  <td className="py-2 pr-2">
                    <div className="relative" ref={dropdownRef}>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                        <Input
                          placeholder="Search product..."
                          className="h-8 text-xs pl-6"
                          value={productSearch}
                          onChange={(e) => {
                            setProductSearch(e.target.value)
                            setNewItem({ ...newItem, item_name: e.target.value })
                            setShowDropdown(true)
                          }}
                          onFocus={() => productSearch.length >= 2 && setShowDropdown(true)}
                        />
                      </div>
                      {showDropdown && searchResults && searchResults.length > 0 && (
                        <div className="absolute z-50 top-full left-0 w-72 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 overflow-hidden">
                          {(searchResults as Product[]).map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-amber-50 border-b border-gray-100 last:border-0 transition-colors"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                selectProduct(product)
                              }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-gray-900 truncate">
                                    {product.item_name}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {product.sku || 'No SKU'} · {product.category}
                                  </p>
                                </div>
                                <span className="text-xs font-semibold text-amber-700 whitespace-nowrap flex-shrink-0">
                                  {formatCurrency(product.selling_price as number)}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      placeholder="SKU"
                      className="h-8 text-xs"
                      value={newItem.sku}
                      onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number"
                      min="1"
                      className="h-8 text-xs w-16 ml-auto"
                      value={newItem.quantity}
                      onChange={(e) =>
                        setNewItem({ ...newItem, quantity: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number"
                      min="0"
                      className="h-8 text-xs w-24 ml-auto"
                      value={newItem.unit_price}
                      onChange={(e) =>
                        setNewItem({ ...newItem, unit_price: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      className="h-8 text-xs w-16 ml-auto"
                      value={newItem.discount}
                      onChange={(e) =>
                        setNewItem({ ...newItem, discount: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="py-2 text-right text-xs text-gray-500">
                    {formatCurrency(
                      newItem.unit_price * newItem.quantity * (1 - newItem.discount / 100)
                    )}
                  </td>
                  <td className="py-2 pl-2">
                    <Button
                      size="sm"
                      onClick={handleAddItem}
                      disabled={addingItem}
                      className="h-8 w-8 p-0 bg-amber-600 hover:bg-amber-700"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(quotation.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Discount</span>
                  <span className="text-red-500">-{formatCurrency(quotation.discount)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax</span>
                  <span>{formatCurrency(quotation.tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5 text-base">
                  <span>Total</span>
                  <span>{formatCurrency(quotation.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zoho Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="outline"
          onClick={() => convertToEstimate()}
          disabled={convertingEstimate || !!quotation.zoho_estimate_id}
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          {convertingEstimate ? 'Converting...' : 'Convert to Zoho Estimate'}
        </Button>
        <Button
          variant="outline"
          onClick={() => convertToInvoice()}
          disabled={convertingInvoice || !!quotation.zoho_invoice_id}
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          {convertingInvoice ? 'Converting...' : 'Convert to Zoho Invoice'}
        </Button>
      </div>

      {/* Send to Customer */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Send to Customer</CardTitle>
          {quotation.customer_detail && (
            <p className="text-xs text-gray-500 mt-0.5">
              {quotation.customer_detail.full_name}
              {quotation.customer_detail.mobile && ` · ${quotation.customer_detail.mobile}`}
              {quotation.customer_detail.email && ` · ${quotation.customer_detail.email}`}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {/* WhatsApp */}
            <Button
              onClick={handleWhatsApp}
              disabled={!customerMobile}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Send via WhatsApp
            </Button>

            {/* Copy to Clipboard */}
            <Button
              variant="outline"
              onClick={handleCopyClipboard}
              className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <Clipboard className="h-4 w-4" />
              Copy Estimate
            </Button>

            {/* Email — only if customer has email */}
            {customerEmail && (
              <Button
                variant="outline"
                onClick={handleEmail}
                className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Mail className="h-4 w-4" />
                Send via Email
              </Button>
            )}
          </div>

          {!customerMobile && !customerEmail && (
            <p className="text-xs text-gray-400 mt-3">
              No contact details found for this customer. Add mobile/email to enable sending.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useRef } from 'react'
import { ArrowLeft, Upload, ImageIcon, FileText, Gem, Pencil, TrendingUp, TrendingDown, Zap, Calculator, ChevronDown, ChevronUp } from 'lucide-react'
import Image from 'next/image'
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
import { GoldPriceTicker } from '@/components/dashboard/gold-price-ticker'
import { Skeleton } from '@/components/ui/skeleton'
import { useProduct, useUpdateProduct, useUploadProductImage } from '@/hooks/use-products'
import { useGoldPrices } from '@/hooks/use-dashboard'
import { formatCurrency, formatDate, formatWeight } from '@/lib/utils'
import { INVENTORY_STATUSES, PRODUCT_CATEGORIES, METAL_TYPES, METAL_PURITIES } from '@/lib/constants'
import { toast } from 'sonner'

const CERTIFICATION_TYPES = ['none', 'igi', 'gia', 'huid', 'bis', 'igl', 'other']

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const productId = Number(id)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editData, setEditData] = useState<Record<string, any>>({})

  // Price calculator state
  const [showCalc, setShowCalc]     = useState(false)
  const [makingPct, setMakingPct]   = useState('')
  const [makingFlat, setMakingFlat] = useState('')
  const [stoneCost, setStoneCost]   = useState('')
  const [gstPct, setGstPct]         = useState('3')

  const { data: product, isLoading } = useProduct(productId)
  const { mutate: updateProduct, isPending: updating } = useUpdateProduct(productId)
  const { mutate: uploadImage, isPending: uploadingImage } = useUploadProductImage(productId)
  const { data: liveGoldData } = useGoldPrices()

  // Compute live metal value from product's net_weight + metal_purity
  const getLiveMetalValue = (): { value: number; rate: number; label: string } | null => {
    if (!liveGoldData || !product?.net_weight) return null
    const purity = (product.metal_purity || '').toLowerCase()
    const weight = parseFloat(product.net_weight)
    if (!weight) return null
    // Gold karats
    if (['24k', '22k', '18k', '14k'].includes(purity)) {
      const rate = liveGoldData.gold?.per_gram?.[purity]
      if (!rate) return null
      return { value: Math.round(rate * weight), rate: Math.round(rate), label: purity.toUpperCase() + ' Gold' }
    }
    // Silver
    if (purity === '925') {
      const rate = liveGoldData.silver?.per_gram?.['999']
      if (!rate) return null
      return { value: Math.round(rate * weight), rate: Math.round(rate), label: '925 Silver' }
    }
    return null
  }

  const liveMetalValue = getLiveMetalValue()

  // Derived calculator values
  const metalCost   = liveMetalValue?.value ?? 0
  const making      = makingPct ? Math.round(metalCost * (parseFloat(makingPct) / 100)) : parseFloat(makingFlat) || 0
  const stone       = parseFloat(stoneCost) || 0
  const preTax      = metalCost + making + stone
  const gst         = Math.round(preTax * ((parseFloat(gstPct) || 0) / 100))
  const suggested   = preTax + gst

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val)

  const applyPrice = () => {
    if (suggested > 0) {
      updateProduct({ selling_price: suggested }, {
        onSuccess: () => toast.success(`Selling price updated to ${formatINR(suggested)}`),
        onError:   () => toast.error('Failed to update price'),
      })
    }
  }

  const handleStatusChange = (status: string) => {
    updateProduct({ inventory_status: status })
  }

  const handleImageUpload = (file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    uploadImage(formData)
  }

  const openEdit = () => {
    setEditData({
      item_name: product?.item_name || '',
      sku: product?.sku || '',
      category: product?.category || '',
      subcategory: product?.subcategory || '',
      metal_type: product?.metal_type || '',
      metal_purity: product?.metal_purity || '',
      stone_type: product?.stone_type || '',
      certification_type: product?.certification_type || 'none',
      certification_number: product?.certification_number || '',
      selling_price: product?.selling_price || '',
      purchase_price: product?.purchase_price || '',
      gross_weight: product?.gross_weight || '',
      net_weight: product?.net_weight || '',
      diamond_weight: product?.diamond_weight || '',
      description: product?.description || '',
    })
    setEditOpen(true)
  }

  const handleSave = () => {
    // Decimal fields must be null (not '') when empty — Django rejects empty strings
    const DECIMAL_FIELDS = ['selling_price', 'purchase_price', 'gross_weight', 'net_weight', 'diamond_weight']
    const cleaned = Object.fromEntries(
      Object.entries(editData).map(([k, v]) => [
        k,
        DECIMAL_FIELDS.includes(k) && v === '' ? null : v,
      ])
    )
    updateProduct(cleaned, {
      onSuccess: () => {
        toast.success('Product updated')
        setEditOpen(false)
      },
      onError: () => toast.error('Failed to update product'),
    })
  }

  const set = (field: string, value: any) =>
    setEditData((prev) => ({ ...prev, [field]: value }))

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      </div>
    )
  }

  if (!product) {
    return <div className="text-center py-16 text-gray-400">Product not found</div>
  }

  const primaryImage = product.images?.find((img: any) => img.is_primary) || product.images?.[0]

  return (
    <div className="space-y-6 max-w-5xl">
      <GoldPriceTicker />
      <PageHeader
        title={product.item_name}
        description={product.sku ? `SKU: ${product.sku}` : 'No SKU assigned'}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => router.back()} className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button variant="outline" onClick={openEdit} className="gap-1">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Status:</span>
              <Select value={product.inventory_status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-40 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="images">
            Images {product.images?.length ? `(${product.images.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="certificates">
            Certificates {product.certificates?.length ? `(${product.certificates.length})` : ''}
          </TabsTrigger>
        </TabsList>

        {/* Details tab */}
        <TabsContent value="details" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* ── Left col: image + quick info ── */}
            <div className="space-y-4">
              {/* Image */}
              <Card className="overflow-hidden">
                <div className="aspect-square bg-gray-50 flex items-center justify-center relative">
                  {primaryImage ? (
                    <Image src={primaryImage.file_url} alt={product.item_name} fill className="object-cover" sizes="400px" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-300">
                      <Gem className="h-16 w-16" />
                      <p className="text-xs mt-2 capitalize">{product.category}</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Metal chips */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {product.metal_type && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 capitalize">
                        {product.metal_type === 'gold' ? '🥇' : product.metal_type === 'silver' ? '🥈' : '💍'} {product.metal_type}
                      </span>
                    )}
                    {product.metal_purity && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-600 text-white uppercase">
                        {product.metal_purity}
                      </span>
                    )}
                    {product.category && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                        {product.category.replace(/_/g, ' ')}
                      </span>
                    )}
                    {product.stone_type && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                        💎 {product.stone_type}
                      </span>
                    )}
                  </div>
                  {product.certification_type && product.certification_type !== 'none' && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 uppercase">
                        ✓ {product.certification_type}
                      </span>
                      {product.certification_number && (
                        <span className="text-xs text-gray-500 font-mono">{product.certification_number}</span>
                      )}
                    </div>
                  )}
                  {product.date_of_purchase && (
                    <div>
                      <p className="text-xs text-gray-400">Date of Purchase</p>
                      <p className="text-sm font-medium text-gray-700">{formatDate(product.date_of_purchase)}</p>
                    </div>
                  )}
                  {product.subcategory && (
                    <div>
                      <p className="text-xs text-gray-400">Subcategory</p>
                      <p className="text-sm font-medium text-gray-700 capitalize">{product.subcategory}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Right cols: pricing + weight + calculator ── */}
            <div className="md:col-span-2 space-y-4">

              {/* Pricing highlight row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border-2 border-amber-200 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium">Selling Price</p>
                  <p className="text-xl font-bold text-amber-700 tabular-nums mt-0.5">
                    {product.selling_price ? formatINR(Number(product.selling_price)) : '—'}
                  </p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium">Purchase Price</p>
                  <p className="text-xl font-bold text-gray-800 tabular-nums mt-0.5">
                    {product.purchase_price ? formatINR(Number(product.purchase_price)) : '—'}
                  </p>
                </div>
                <div className={`rounded-xl p-4 border-2 ${Number(product.margin) > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-xs text-gray-400 font-medium">Margin</p>
                  <p className={`text-xl font-bold tabular-nums mt-0.5 ${Number(product.margin) > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                    {product.margin ? `${Number(product.margin).toFixed(2)}%` : '—'}
                  </p>
                </div>
              </div>

              {/* Weight row */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">Weight</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    {[
                      { label: 'Gross Weight', value: product.gross_weight ? `${parseFloat(product.gross_weight).toFixed(3)} g` : null },
                      { label: 'Net Weight',   value: product.net_weight   ? `${parseFloat(product.net_weight).toFixed(3)} g`   : null },
                      { label: 'Diamond Wt.',  value: product.diamond_weight ? `${parseFloat(product.diamond_weight).toFixed(3)} ct` : null },
                    ].map((item) => (
                      <div key={item.label} className={`rounded-lg p-3 ${item.value ? 'bg-gray-50 border border-gray-200' : 'bg-gray-50/50 border border-dashed border-gray-200'}`}>
                        <p className="text-xs text-gray-400">{item.label}</p>
                        {item.value
                          ? <p className="text-base font-bold text-gray-900 tabular-nums mt-0.5">{item.value}</p>
                          : <p className="text-sm text-gray-300 mt-0.5">Not set</p>
                        }
                      </div>
                    ))}
                  </div>
                  {!product.net_weight && !product.gross_weight && (
                    <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                      <Pencil className="h-3 w-3" /> Click <strong>Edit</strong> to add weight — required for live pricing calculator.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Live metal value strip */}
              {liveMetalValue && (
                <div className="bg-amber-950/90 rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                    </span>
                    <span className="text-amber-300 text-xs font-semibold">Live Metal Value</span>
                  </div>
                  <div className="text-xs text-amber-400">
                    {liveMetalValue.label} @ ₹{liveMetalValue.rate.toLocaleString('en-IN')}/g
                    {' × '}{parseFloat(product.net_weight).toFixed(3)}g
                  </div>
                  <div className="text-amber-100 font-bold text-sm tabular-nums">
                    = ₹{liveMetalValue.value.toLocaleString('en-IN')}
                  </div>
                  {product.selling_price && (
                    (() => {
                      const diff = Number(product.selling_price) - liveMetalValue.value
                      const pct = ((diff / liveMetalValue.value) * 100).toFixed(1)
                      const up = diff >= 0
                      return (
                        <div className={`flex items-center gap-1 text-xs font-medium ${up ? 'text-green-400' : 'text-red-400'}`}>
                          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {up ? '+' : ''}{pct}% above metal cost
                        </div>
                      )
                    })()
                  )}
                </div>
              )}

              {/* Live Price Calculator */}
              {liveMetalValue && (
                <Card className="border-amber-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-amber-600" />
                        <CardTitle className="text-sm font-semibold text-gray-700">Live Price Calculator</CardTitle>
                      </div>
                      <button
                        onClick={() => setShowCalc(!showCalc)}
                        className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"
                      >
                        {showCalc ? <><ChevronUp className="h-3.5 w-3.5" /> Hide</> : <><ChevronDown className="h-3.5 w-3.5" /> Open Calculator</>}
                      </button>
                    </div>
                    {/* Always-visible metal cost row */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-gray-500">Metal cost today:</span>
                      <span className="text-sm font-bold text-amber-700 tabular-nums">{formatINR(metalCost)}</span>
                      <span className="text-xs text-gray-400">({liveMetalValue.label} · {formatINR(liveMetalValue.rate)}/g × {parseFloat(product.net_weight).toFixed(3)}g)</span>
                    </div>
                  </CardHeader>

                  {showCalc && (
                    <CardContent className="space-y-4 pt-0">
                      {/* Making charges */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Making Charges</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs text-gray-500">Percentage (%)</label>
                            <input
                              type="number" min="0" max="100" step="0.1"
                              placeholder="e.g. 12"
                              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                              value={makingPct}
                              onChange={(e) => { setMakingPct(e.target.value); setMakingFlat('') }}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-gray-500">Flat Amount (₹)</label>
                            <input
                              type="number" min="0"
                              placeholder="or flat ₹"
                              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                              value={makingFlat}
                              onChange={(e) => { setMakingFlat(e.target.value); setMakingPct('') }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Stone + GST */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500">Stone / Diamond Cost (₹)</label>
                          <input
                            type="number" min="0"
                            placeholder="0"
                            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                            value={stoneCost}
                            onChange={(e) => setStoneCost(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500">GST %</label>
                          <select
                            value={gstPct}
                            onChange={(e) => setGstPct(e.target.value)}
                            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
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

                      {/* Breakdown */}
                      <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200 text-sm overflow-hidden">
                        {[
                          { label: `Metal cost (${parseFloat(product.net_weight).toFixed(3)}g)`, value: metalCost },
                          { label: `Making ${makingPct ? `(${makingPct}%)` : makingFlat ? '(flat)' : ''}`, value: making },
                          ...(stone > 0 ? [{ label: 'Stone cost', value: stone }] : []),
                          { label: `GST (${gstPct}%)`, value: gst },
                        ].map((row) => (
                          <div key={row.label} className="flex justify-between items-center px-4 py-2.5 text-gray-600">
                            <span>{row.label}</span>
                            <span className="tabular-nums font-medium">{row.value > 0 ? formatINR(row.value) : '—'}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center px-4 py-3 bg-white font-bold text-gray-900">
                          <span>Suggested Selling Price</span>
                          <span className="text-amber-700 text-base tabular-nums">{suggested > 0 ? formatINR(suggested) : '—'}</span>
                        </div>
                      </div>

                      {suggested > 0 && (
                        <Button
                          onClick={applyPrice}
                          disabled={updating}
                          className="w-full bg-amber-600 hover:bg-amber-700 gap-2 h-11"
                        >
                          <Zap className="h-4 w-4" />
                          {updating ? 'Updating...' : `Update Selling Price to ${formatINR(suggested)}`}
                        </Button>
                      )}
                    </CardContent>
                  )}
                </Card>
              )}

              {product.description && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700">Description / Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 font-mono leading-relaxed border border-gray-100">
                      {product.description}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Images tab */}
        <TabsContent value="images" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Product images</p>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
              >
                <Upload className="h-4 w-4" />
                {uploadingImage ? 'Uploading...' : 'Upload Image'}
              </Button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleImageUpload(f)
                }}
              />
            </div>

            {product.images && product.images.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {product.images.map((img: any) => (
                  <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                    <Image
                      src={img.file_url}
                      alt={img.file_name}
                      fill
                      className="object-cover"
                      sizes="150px"
                    />
                    {img.is_primary && (
                      <div className="absolute bottom-0 inset-x-0 bg-amber-600 text-white text-xs text-center py-0.5">
                        Primary
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                <ImageIcon className="h-10 w-10 mb-2" />
                <p className="text-sm">No images uploaded yet</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Certificates tab */}
        <TabsContent value="certificates" className="mt-4">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Certification documents</p>
            {product.certificates && product.certificates.length > 0 ? (
              <div className="space-y-2">
                {product.certificates.map((cert: any) => (
                  <div key={cert.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{cert.certificate_type}</p>
                      {cert.certificate_number && (
                        <p className="text-xs text-gray-500">{cert.certificate_number}</p>
                      )}
                    </div>
                    <a href={cert.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                      View
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                <FileText className="h-10 w-10 mb-2" />
                <p className="text-sm">No certificates uploaded yet</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Product Name *</Label>
                <Input value={editData.item_name || ''} onChange={(e) => set('item_name', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>SKU</Label>
                <Input value={editData.sku || ''} onChange={(e) => set('sku', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Subcategory</Label>
                <Input value={editData.subcategory || ''} onChange={(e) => set('subcategory', e.target.value)} />
              </div>
            </div>

            {/* Category + Metal */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={editData.category || ''} onValueChange={(v) => set('category', v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {(PRODUCT_CATEGORIES || []).map((c: any) => (
                      <SelectItem key={c.value || c} value={c.value || c}>{c.label || c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Metal Type</Label>
                <Select value={editData.metal_type || ''} onValueChange={(v) => set('metal_type', v)}>
                  <SelectTrigger><SelectValue placeholder="Select metal" /></SelectTrigger>
                  <SelectContent>
                    {(METAL_TYPES || []).map((m: any) => (
                      <SelectItem key={m.value || m} value={m.value || m}>{m.label || m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Metal Purity</Label>
                <Select value={editData.metal_purity || ''} onValueChange={(v) => set('metal_purity', v)}>
                  <SelectTrigger><SelectValue placeholder="Select purity" /></SelectTrigger>
                  <SelectContent>
                    {(METAL_PURITIES || []).map((p: any) => (
                      <SelectItem key={p.value || p} value={p.value || p}>{p.label || p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Stone Type</Label>
                <Input value={editData.stone_type || ''} onChange={(e) => set('stone_type', e.target.value)} />
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Selling Price (₹)</Label>
                <Input type="number" value={editData.selling_price || ''} onChange={(e) => set('selling_price', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Purchase Price (₹)</Label>
                <Input type="number" value={editData.purchase_price || ''} onChange={(e) => set('purchase_price', e.target.value)} />
              </div>
            </div>

            {/* Weight */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Gross Weight (g)</Label>
                <Input type="number" step="0.001" value={editData.gross_weight || ''} onChange={(e) => set('gross_weight', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Net Weight (g)</Label>
                <Input type="number" step="0.001" value={editData.net_weight || ''} onChange={(e) => set('net_weight', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Diamond Weight (ct)</Label>
                <Input type="number" step="0.001" value={editData.diamond_weight || ''} onChange={(e) => set('diamond_weight', e.target.value)} />
              </div>
            </div>

            {/* Certification */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Certification Type</Label>
                <Select value={editData.certification_type || 'none'} onValueChange={(v) => set('certification_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CERTIFICATION_TYPES.map((c) => (
                      <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cert. Number</Label>
                <Input value={editData.certification_number || ''} onChange={(e) => set('certification_number', e.target.value)} />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={editData.description || ''}
                onChange={(e) => set('description', e.target.value)}
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

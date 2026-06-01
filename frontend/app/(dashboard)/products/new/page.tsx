'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Zap, TrendingUp, TrendingDown, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { GoldPriceTicker } from '@/components/dashboard/gold-price-ticker'
import { useCreateProduct } from '@/hooks/use-products'
import { useGoldPrices } from '@/hooks/use-dashboard'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'rings', label: 'Rings' },
  { value: 'solitaire_rings', label: 'Solitaire Rings' },
  { value: 'small_earrings', label: 'Small Earrings' },
  { value: 'cocktail_earrings', label: 'Cocktail Earrings' },
  { value: 'solitaire_earrings', label: 'Solitaire Earrings' },
  { value: 'bracelets', label: 'Bracelets' },
  { value: 'bangles', label: 'Bangles' },
  { value: 'necklaces', label: 'Necklaces' },
  { value: 'pendants', label: 'Pendants' },
  { value: 'chains', label: 'Chains' },
  { value: 'pendant_chain', label: 'Pendant Chain' },
  { value: 'nose_pins', label: 'Nose Pins' },
  { value: 'ear_cuffs', label: 'Ear Cuffs' },
  { value: 'other', label: 'Other' },
]

const INVENTORY_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'sold', label: 'Sold' },
  { value: 'returned', label: 'Returned' },
  { value: 'under_service', label: 'Under Service' },
  { value: 'archived', label: 'Archived' },
]

type MetalType = 'gold' | 'silver' | 'platinum'

const METAL_OPTIONS: {
  value: MetalType
  label: string
  emoji: string
  bg: string
  border: string
  activeBg: string
  activeBorder: string
  activeText: string
}[] = [
  {
    value: 'gold',
    label: 'Gold',
    emoji: '🥇',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    activeBg: 'bg-amber-600',
    activeBorder: 'border-amber-600',
    activeText: 'text-white',
  },
  {
    value: 'silver',
    label: 'Silver',
    emoji: '🥈',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    activeBg: 'bg-slate-600',
    activeBorder: 'border-slate-600',
    activeText: 'text-white',
  },
  {
    value: 'platinum',
    label: 'Platinum',
    emoji: '💍',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    activeBg: 'bg-indigo-600',
    activeBorder: 'border-indigo-600',
    activeText: 'text-white',
  },
]

const PURITIES_BY_METAL: Record<MetalType, { value: string; label: string; liveKey: string | null; liveType: 'gold' | 'silver' | null }[]> = {
  gold: [
    { value: '24k', label: '24K', liveKey: '24k', liveType: 'gold' },
    { value: '22k', label: '22K', liveKey: '22k', liveType: 'gold' },
    { value: '18k', label: '18K', liveKey: '18k', liveType: 'gold' },
    { value: '14k', label: '14K', liveKey: '14k', liveType: 'gold' },
  ],
  silver: [
    { value: '925', label: '925', liveKey: '999', liveType: 'silver' },
  ],
  platinum: [
    { value: '950', label: '950 Pt', liveKey: null, liveType: null },
  ],
}

const schema = z.object({
  item_name: z.string().min(1, 'Item name is required'),
  sku: z.string().optional(),
  category: z.string().optional(),
  inventory_status: z.string().optional(),
  selling_price: z.string().optional(),
  purchase_price: z.string().optional(),
  metal_type: z.string().optional(),
  metal_purity: z.string().optional(),
  gross_weight: z.string().optional(),
  net_weight: z.string().optional(),
  hsn_code: z.string().optional(),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function formatINR(val: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NewProductPage() {
  const router = useRouter()
  const { mutate: createProduct, isPending } = useCreateProduct()
  const { data: liveGoldData, isLoading: pricesLoading } = useGoldPrices()

  // Metal & purity selection (UI state — synced to form)
  const [selectedMetal, setSelectedMetal] = useState<MetalType | null>(null)
  const [selectedPurity, setSelectedPurity] = useState<string | null>(null)

  // Pricing calculator state
  const [netWeight, setNetWeight] = useState('')
  const [grossWeight, setGrossWeight] = useState('')
  const [makingPct, setMakingPct] = useState('')
  const [makingFlat, setMakingFlat] = useState('')
  const [stoneCost, setStoneCost] = useState('')
  const [gstPct, setGstPct] = useState('3')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { inventory_status: 'available' },
  })

  // Sync weight fields to form
  useEffect(() => {
    setValue('net_weight', netWeight)
    setValue('gross_weight', grossWeight)
  }, [netWeight, grossWeight, setValue])

  // When metal changes, reset purity and sync to form
  const handleMetalSelect = (metal: MetalType) => {
    setSelectedMetal(metal)
    setSelectedPurity(null)
    setValue('metal_type', metal)
    setValue('metal_purity', undefined)
  }

  // When purity changes, sync to form
  const handlePuritySelect = (purity: string) => {
    setSelectedPurity(purity)
    setValue('metal_purity', purity)
  }

  // Get live rate for selected purity
  const getLiveRate = (): number | null => {
    if (!liveGoldData || !selectedMetal || !selectedPurity) return null
    const purities = PURITIES_BY_METAL[selectedMetal]
    const match = purities.find((p) => p.value === selectedPurity)
    if (!match || !match.liveKey || !match.liveType) return null
    const rate = match.liveType === 'gold'
      ? liveGoldData.gold?.per_gram?.[match.liveKey]
      : liveGoldData.silver?.per_gram?.[match.liveKey]
    return rate ?? null
  }

  const liveRate = getLiveRate()
  const netW = parseFloat(netWeight) || 0
  const metalCost = liveRate ? Math.round(liveRate * netW) : 0
  const making = makingPct
    ? Math.round(metalCost * (parseFloat(makingPct) / 100))
    : parseFloat(makingFlat) || 0
  const stone = parseFloat(stoneCost) || 0
  const preTax = metalCost + making + stone
  const gst = Math.round(preTax * ((parseFloat(gstPct) || 0) / 100))
  const suggestedPrice = preTax + gst

  const applyPrice = () => {
    if (suggestedPrice > 0) {
      setValue('selling_price', String(suggestedPrice))
    }
  }

  const onSubmit = (data: FormData) => {
    createProduct(
      {
        ...data,
        selling_price: data.selling_price ? Number(data.selling_price) : undefined,
        purchase_price: data.purchase_price ? Number(data.purchase_price) : undefined,
        gross_weight: data.gross_weight ? Number(data.gross_weight) : undefined,
        net_weight: data.net_weight ? Number(data.net_weight) : undefined,
      },
      {
        onSuccess: (res) => router.push('/products/' + res.data.id),
      }
    )
  }

  const changePct = liveGoldData?.gold?.change_pct ?? 0
  const changeUp = changePct >= 0

  return (
    <div className="space-y-5 max-w-6xl">
      <GoldPriceTicker />

      <PageHeader
        title="Add Product"
        actions={
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">

          {/* ── LEFT COLUMN ──────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* STEP 1 — Metal Type */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 rounded-full bg-amber-600 text-white text-xs font-bold items-center justify-center">1</span>
                  <CardTitle className="text-sm font-semibold text-gray-800">Select Metal Type</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {METAL_OPTIONS.map((m) => {
                    const isActive = selectedMetal === m.value
                    // Show live rate on the card
                    let liveRateStr = ''
                    if (liveGoldData) {
                      if (m.value === 'gold') liveRateStr = `₹${Math.round(liveGoldData.gold.per_gram['22k']).toLocaleString('en-IN')}/g (22K)`
                      if (m.value === 'silver') liveRateStr = `₹${Math.round(liveGoldData.silver.per_gram['999']).toLocaleString('en-IN')}/g`
                      if (m.value === 'platinum') liveRateStr = 'Manual rate'
                    }
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => handleMetalSelect(m.value)}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-xl border-2 py-4 px-3 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-amber-500',
                          isActive
                            ? `${m.activeBg} ${m.activeBorder} ${m.activeText} shadow-md`
                            : `${m.bg} ${m.border} text-gray-700 hover:shadow-sm`
                        )}
                      >
                        <span className="text-2xl">{m.emoji}</span>
                        <span className="text-sm font-bold">{m.label}</span>
                        {liveRateStr && (
                          <span className={cn('text-[10px] font-medium leading-tight text-center', isActive ? 'text-white/80' : 'text-gray-400')}>
                            {liveRateStr}
                          </span>
                        )}
                        {pricesLoading && (
                          <span className="h-2 w-16 bg-current opacity-20 rounded animate-pulse" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* STEP 2 — Purity / Carat */}
            {selectedMetal && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 rounded-full bg-amber-600 text-white text-xs font-bold items-center justify-center">2</span>
                    <CardTitle className="text-sm font-semibold text-gray-800">Select Purity / Carat</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {PURITIES_BY_METAL[selectedMetal].map((p) => {
                      const isActive = selectedPurity === p.value
                      // Live rate for this purity
                      let rateStr = ''
                      if (liveGoldData && p.liveKey && p.liveType) {
                        const r = p.liveType === 'gold'
                          ? liveGoldData.gold?.per_gram?.[p.liveKey]
                          : liveGoldData.silver?.per_gram?.[p.liveKey]
                        if (r) rateStr = `₹${Math.round(r).toLocaleString('en-IN')}/g`
                      }

                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => handlePuritySelect(p.value)}
                          className={cn(
                            'flex flex-col items-center gap-1 rounded-xl border-2 py-3 px-5 min-w-[90px] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-amber-500',
                            isActive
                              ? 'bg-amber-600 border-amber-600 text-white shadow-md'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-amber-300 hover:bg-amber-50'
                          )}
                        >
                          <span className="text-base font-bold">{p.label}</span>
                          {rateStr ? (
                            <span className={cn('text-xs font-medium', isActive ? 'text-amber-100' : 'text-amber-600')}>
                              {rateStr}
                            </span>
                          ) : (
                            <span className={cn('text-xs', isActive ? 'text-white/60' : 'text-gray-400')}>manual</span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Selected purity highlight */}
                  {selectedPurity && liveRate && (
                    <div className="mt-4 flex items-center gap-3 bg-amber-950 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                        </span>
                        <span className="text-amber-300 text-xs font-semibold">Live Rate</span>
                      </div>
                      <span className="text-amber-100 text-lg font-bold tabular-nums">
                        {formatINR(liveRate)}<span className="text-amber-400 text-sm font-normal">/gram</span>
                      </span>
                      <div className={cn('ml-auto flex items-center gap-1 text-xs font-medium', changeUp ? 'text-green-400' : 'text-red-400')}>
                        {changeUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {changeUp ? '+' : ''}{changePct.toFixed(2)}% today
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* STEP 3 — Weight */}
            {selectedPurity && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 rounded-full bg-amber-600 text-white text-xs font-bold items-center justify-center">3</span>
                    <CardTitle className="text-sm font-semibold text-gray-800">Weight</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-gray-700">Net Weight (g) <span className="text-amber-500">*</span></Label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="0.000"
                        value={netWeight}
                        onChange={(e) => setNetWeight(e.target.value)}
                        className="h-10 text-base font-medium"
                      />
                      <p className="text-xs text-gray-400">Pure metal weight (used for pricing)</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-700">Gross Weight (g)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="0.000"
                        value={grossWeight}
                        onChange={(e) => setGrossWeight(e.target.value)}
                        className="h-10 text-base font-medium"
                      />
                      <p className="text-xs text-gray-400">Total piece weight</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 4 — Product Details */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 rounded-full bg-gray-400 text-white text-xs font-bold items-center justify-center">4</span>
                  <CardTitle className="text-sm font-semibold text-gray-800">Product Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Item Name *</Label>
                  <Input {...register('item_name')} placeholder="e.g. Diamond Solitaire Ring 22K" className="h-10" />
                  {errors.item_name && <p className="text-xs text-red-500">{errors.item_name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>SKU</Label>
                  <Input {...register('sku')} placeholder="e.g. RNG-001" />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select onValueChange={(v) => setValue('category', v)}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Inventory Status</Label>
                  <Select defaultValue="available" onValueChange={(v) => setValue('inventory_status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INVENTORY_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>HSN Code</Label>
                  <Input {...register('hsn_code')} placeholder="e.g. 7113" />
                </div>
                <div className="space-y-1.5">
                  <Label>Selling Price (₹)</Label>
                  <Input {...register('selling_price')} type="number" placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>Purchase Price (₹)</Label>
                  <Input {...register('purchase_price')} type="number" placeholder="0" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Description</Label>
                  <Textarea {...register('description')} placeholder="Product description..." className="min-h-[80px]" />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 justify-end pb-8">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={isPending} className="bg-amber-600 hover:bg-amber-700 px-8">
                {isPending ? 'Adding...' : 'Add Product'}
              </Button>
            </div>
          </div>

          {/* ── RIGHT COLUMN — Live Pricing Calculator (sticky) ──────────── */}
          <div className="lg:sticky lg:top-6 space-y-4">
            <Card className="border-amber-200 overflow-hidden">
              <div className="bg-amber-950 px-4 py-3 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-amber-400" />
                <span className="text-amber-200 text-sm font-semibold">Live Price Calculator</span>
                {liveRate && (
                  <span className="ml-auto flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                    </span>
                    <span className="text-[10px] text-green-400 font-medium">Live</span>
                  </span>
                )}
              </div>

              <CardContent className="pt-4 space-y-4">
                {/* Selected metal/purity summary */}
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedMetal ? (
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 rounded-full px-3 py-1 text-xs font-semibold capitalize">
                      {METAL_OPTIONS.find(m => m.value === selectedMetal)?.emoji} {selectedMetal}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">← Select metal type</span>
                  )}
                  {selectedPurity && (
                    <span className="inline-flex items-center bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-xs font-semibold uppercase">
                      {selectedPurity}
                    </span>
                  )}
                </div>

                {liveRate ? (
                  <>
                    {/* Rate display */}
                    <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                      <p className="text-xs text-amber-600 font-medium mb-1">Live Rate / gram</p>
                      <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatINR(liveRate)}</p>
                    </div>

                    {/* Making charges */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Making Charges</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">Percentage (%)</Label>
                          <Input
                            type="number" min="0" max="100" step="0.1"
                            placeholder="e.g. 12"
                            className="h-8 text-sm"
                            value={makingPct}
                            onChange={(e) => { setMakingPct(e.target.value); setMakingFlat('') }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">Flat (₹)</Label>
                          <Input
                            type="number" min="0"
                            placeholder="or flat ₹"
                            className="h-8 text-sm"
                            value={makingFlat}
                            onChange={(e) => { setMakingFlat(e.target.value); setMakingPct('') }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Stone cost */}
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Stone / Diamond Cost (₹)</Label>
                      <Input
                        type="number" min="0"
                        placeholder="0"
                        className="h-8 text-sm"
                        value={stoneCost}
                        onChange={(e) => setStoneCost(e.target.value)}
                      />
                    </div>

                    {/* GST */}
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">GST %</Label>
                      <select
                        value={gstPct}
                        onChange={(e) => setGstPct(e.target.value)}
                        className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="0">0%</option>
                        <option value="1.5">1.5%</option>
                        <option value="3">3% (Gold/Silver)</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                      </select>
                    </div>

                    {/* Breakdown */}
                    <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm border border-gray-200">
                      <div className="flex justify-between text-gray-500">
                        <span>Metal cost</span>
                        <span className="tabular-nums">{netW > 0 ? formatINR(metalCost) : '—'}</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>Making {makingPct ? `(${makingPct}%)` : makingFlat ? '(flat)' : ''}</span>
                        <span className="tabular-nums">{making > 0 ? formatINR(making) : '—'}</span>
                      </div>
                      {stone > 0 && (
                        <div className="flex justify-between text-gray-500">
                          <span>Stone cost</span>
                          <span className="tabular-nums">{formatINR(stone)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-gray-500 border-t border-gray-200 pt-1.5">
                        <span>GST ({gstPct}%)</span>
                        <span className="tabular-nums">{gst > 0 ? formatINR(gst) : '—'}</span>
                      </div>
                      <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5 text-base">
                        <span>Suggested Price</span>
                        <span className="text-amber-700 tabular-nums">{suggestedPrice > 0 ? formatINR(suggestedPrice) : '—'}</span>
                      </div>
                    </div>

                    {suggestedPrice > 0 && (
                      <Button
                        type="button"
                        onClick={applyPrice}
                        className="w-full bg-amber-600 hover:bg-amber-700 gap-2"
                      >
                        <Zap className="h-4 w-4" />
                        Use {formatINR(suggestedPrice)} as Selling Price
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="py-8 flex flex-col items-center gap-2 text-center text-gray-400">
                    <Calculator className="h-10 w-10 opacity-30" />
                    <p className="text-sm font-medium text-gray-500">
                      {!selectedMetal ? 'Select a metal type to begin' : !selectedPurity ? 'Now choose a purity/carat' : 'Enter net weight to calculate'}
                    </p>
                    <p className="text-xs">Live rates load automatically</p>
                  </div>
                )}

                {/* All gold rates reference */}
                {liveGoldData && (
                  <div className="border-t border-gray-100 pt-3 space-y-1.5">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Today&apos;s Rates</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['24k', '22k', '18k', '14k'] as const).map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => {
                            if (selectedMetal === 'gold') handlePuritySelect(k)
                          }}
                          className={cn(
                            'flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs border transition-colors',
                            selectedPurity === k && selectedMetal === 'gold'
                              ? 'bg-amber-600 border-amber-600 text-white'
                              : 'bg-amber-50 border-amber-100 text-gray-700 hover:border-amber-300'
                          )}
                        >
                          <span className="font-semibold">{k.toUpperCase()}</span>
                          <span className="tabular-nums">₹{Math.round(liveGoldData.gold.per_gram[k]).toLocaleString('en-IN')}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedMetal === 'silver') handlePuritySelect('925')
                        }}
                        className={cn(
                          'flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs border transition-colors col-span-2',
                          selectedPurity === '925' && selectedMetal === 'silver'
                            ? 'bg-slate-600 border-slate-600 text-white'
                            : 'bg-slate-50 border-slate-100 text-gray-700 hover:border-slate-300'
                        )}
                      >
                        <span className="font-semibold">Silver 925</span>
                        <span className="tabular-nums">₹{Math.round(liveGoldData.silver.per_gram['999']).toLocaleString('en-IN')}/g</span>
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </form>
    </div>
  )
}

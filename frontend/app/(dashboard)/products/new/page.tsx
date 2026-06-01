'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Zap, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react'
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

const METAL_OPTIONS = [
  { value: 'gold'     as MetalType, label: 'Gold',     emoji: '🥇', liveKey: null },
  { value: 'silver'   as MetalType, label: 'Silver',   emoji: '🥈', liveKey: null },
  { value: 'platinum' as MetalType, label: 'Platinum', emoji: '💍', liveKey: null },
]

const PURITIES_BY_METAL: Record<MetalType, { value: string; label: string; liveKey: string | null; liveType: 'gold' | 'silver' | null }[]> = {
  gold: [
    { value: '24k', label: '24K', liveKey: '24k', liveType: 'gold' },
    { value: '22k', label: '22K', liveKey: '22k', liveType: 'gold' },
    { value: '18k', label: '18K', liveKey: '18k', liveType: 'gold' },
    { value: '14k', label: '14K', liveKey: '14k', liveType: 'gold' },
  ],
  silver:   [{ value: '925', label: '925',   liveKey: '999', liveType: 'silver' }],
  platinum: [{ value: '950', label: '950 Pt', liveKey: null, liveType: null }],
}

const schema = z.object({
  item_name:        z.string().min(1, 'Item name is required'),
  sku:              z.string().optional(),
  category:         z.string().optional(),
  inventory_status: z.string().optional(),
  selling_price:    z.string().optional(),
  purchase_price:   z.string().optional(),
  metal_type:       z.string().optional(),
  metal_purity:     z.string().optional(),
  gross_weight:     z.string().optional(),
  net_weight:       z.string().optional(),
  hsn_code:         z.string().optional(),
  description:      z.string().optional(),
})
type FormData = z.infer<typeof schema>

function formatINR(val: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(val)
}

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepBadge({ n, done }: { n: number; done?: boolean }) {
  return (
    <span className={cn(
      'flex h-6 w-6 rounded-full text-xs font-bold items-center justify-center flex-shrink-0',
      done ? 'bg-green-500 text-white' : 'bg-amber-600 text-white'
    )}>
      {done ? '✓' : n}
    </span>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function NewProductPage() {
  const router = useRouter()
  const { mutate: createProduct, isPending } = useCreateProduct()
  const { data: liveGoldData } = useGoldPrices()

  // UI selection state (also synced to form)
  const [selectedMetal,  setSelectedMetal]  = useState<MetalType | null>(null)
  const [selectedPurity, setSelectedPurity] = useState<string | null>(null)

  // Weight
  const [netWeight,   setNetWeight]   = useState('')
  const [grossWeight, setGrossWeight] = useState('')

  // Calculator
  const [makingPct,   setMakingPct]   = useState('')
  const [makingFlat,  setMakingFlat]  = useState('')
  const [stoneCost,   setStoneCost]   = useState('')
  const [gstPct,      setGstPct]      = useState('3')
  const [showCalc,    setShowCalc]    = useState(true)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { inventory_status: 'available' },
  })

  // ── Helpers ────────────────────────────────────────────────────────────────
  const handleMetalSelect = (metal: MetalType) => {
    setSelectedMetal(metal)
    setSelectedPurity(null)
    setValue('metal_type', metal)
    setValue('metal_purity', undefined)
  }

  const handlePuritySelect = (purity: string) => {
    setSelectedPurity(purity)
    setValue('metal_purity', purity)
  }

  const getLiveRate = (): number | null => {
    if (!liveGoldData || !selectedMetal || !selectedPurity) return null
    const match = PURITIES_BY_METAL[selectedMetal].find(p => p.value === selectedPurity)
    if (!match?.liveKey || !match.liveType) return null
    return match.liveType === 'gold'
      ? liveGoldData.gold?.per_gram?.[match.liveKey] ?? null
      : liveGoldData.silver?.per_gram?.[match.liveKey] ?? null
  }

  const liveRate   = getLiveRate()
  const netW       = parseFloat(netWeight) || 0
  const metalCost  = liveRate ? Math.round(liveRate * netW) : 0
  const making     = makingPct ? Math.round(metalCost * (parseFloat(makingPct) / 100)) : parseFloat(makingFlat) || 0
  const stone      = parseFloat(stoneCost) || 0
  const preTax     = metalCost + making + stone
  const gst        = Math.round(preTax * ((parseFloat(gstPct) || 0) / 100))
  const suggested  = preTax + gst

  const changePct = liveGoldData?.gold?.change_pct ?? 0
  const changeUp  = changePct >= 0

  const applyPrice = () => {
    if (suggested > 0) setValue('selling_price', String(suggested))
  }

  const onSubmit = (data: FormData) => {
    createProduct(
      {
        ...data,
        selling_price:  data.selling_price  ? Number(data.selling_price)  : undefined,
        purchase_price: data.purchase_price ? Number(data.purchase_price) : undefined,
        gross_weight:   data.gross_weight   ? Number(data.gross_weight)   : undefined,
        net_weight:     data.net_weight     ? Number(data.net_weight)     : undefined,
      },
      { onSuccess: (res) => router.push('/products/' + res.data.id) }
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">
      <GoldPriceTicker />

      <PageHeader
        title="Add Product"
        actions={
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* ── STEP 1: Metal Type ─────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <StepBadge n={1} done={!!selectedMetal} />
              <CardTitle className="text-sm font-semibold text-gray-800">Metal Type</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {METAL_OPTIONS.map((m) => {
                const active = selectedMetal === m.value
                let sub = ''
                if (liveGoldData) {
                  if (m.value === 'gold')   sub = `₹${Math.round(liveGoldData.gold.per_gram['22k']).toLocaleString('en-IN')}/g · 22K`
                  if (m.value === 'silver') sub = `₹${Math.round(liveGoldData.silver.per_gram['999']).toLocaleString('en-IN')}/g`
                  if (m.value === 'platinum') sub = 'Enter manually'
                }
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => handleMetalSelect(m.value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border-2 py-4 px-2 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400',
                      active
                        ? 'bg-amber-600 border-amber-600 text-white shadow-md scale-[1.02]'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-amber-300 hover:bg-amber-50'
                    )}
                  >
                    <span className="text-2xl">{m.emoji}</span>
                    <span className="text-sm font-bold">{m.label}</span>
                    {sub && (
                      <span className={cn('text-[10px] leading-tight text-center', active ? 'text-amber-100' : 'text-gray-400')}>
                        {sub}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── STEP 2: Purity / Carat ─────────────────────────────────────── */}
        {selectedMetal && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <StepBadge n={2} done={!!selectedPurity} />
                <CardTitle className="text-sm font-semibold text-gray-800">Purity / Carat</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {PURITIES_BY_METAL[selectedMetal].map((p) => {
                  const active = selectedPurity === p.value
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
                        'flex flex-col items-center gap-1 rounded-xl border-2 py-3 px-5 min-w-[80px] transition-all focus:outline-none focus:ring-2 focus:ring-amber-400',
                        active
                          ? 'bg-amber-600 border-amber-600 text-white shadow-md'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-amber-300 hover:bg-amber-50'
                      )}
                    >
                      <span className="text-base font-bold">{p.label}</span>
                      <span className={cn('text-xs font-medium', active ? 'text-amber-100' : rateStr ? 'text-amber-600' : 'text-gray-400')}>
                        {rateStr || 'manual'}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Selected purity live rate banner */}
              {selectedPurity && liveRate && (
                <div className="flex items-center gap-3 bg-amber-950 rounded-xl px-4 py-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                    <span className="text-amber-300 text-xs font-semibold">Live Rate — {selectedPurity.toUpperCase()}</span>
                  </div>
                  <span className="text-amber-100 text-xl font-bold tabular-nums">
                    {formatINR(liveRate)}<span className="text-amber-400 text-sm font-normal">/gram</span>
                  </span>
                  <span className={cn('ml-auto flex items-center gap-1 text-xs font-medium', changeUp ? 'text-green-400' : 'text-red-400')}>
                    {changeUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {changeUp ? '+' : ''}{changePct.toFixed(2)}% today
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── STEP 3: Weight ─────────────────────────────────────────────── */}
        {selectedPurity && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <StepBadge n={3} done={netWeight !== '' && parseFloat(netWeight) > 0} />
                <CardTitle className="text-sm font-semibold text-gray-800">Weight</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Net Weight (g) <span className="text-amber-500">*</span></Label>
                  <Input
                    type="number" step="0.001" min="0"
                    placeholder="0.000"
                    value={netWeight}
                    onChange={(e) => { setNetWeight(e.target.value); setValue('net_weight', e.target.value) }}
                    className="h-11 text-base font-semibold"
                  />
                  <p className="text-xs text-gray-400">Pure metal — used for pricing</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Gross Weight (g)</Label>
                  <Input
                    type="number" step="0.001" min="0"
                    placeholder="0.000"
                    value={grossWeight}
                    onChange={(e) => { setGrossWeight(e.target.value); setValue('gross_weight', e.target.value) }}
                    className="h-11 text-base font-semibold"
                  />
                  <p className="text-xs text-gray-400">Total piece weight</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 4: Live Price Calculator ──────────────────────────────── */}
        {selectedPurity && liveRate && (
          <Card className="border-amber-300">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StepBadge n={4} done={suggested > 0} />
                  <CardTitle className="text-sm font-semibold text-gray-800">Price Calculator</CardTitle>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCalc(!showCalc)}
                  className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"
                >
                  {showCalc ? <><ChevronUp className="h-3.5 w-3.5" /> Hide</> : <><ChevronDown className="h-3.5 w-3.5" /> Show</>}
                </button>
              </div>
            </CardHeader>

            {showCalc && (
              <CardContent className="pt-4 space-y-5">
                {/* Rate display */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs text-amber-600 font-medium">Live Rate / gram</p>
                    <p className="text-xl font-bold text-gray-900 tabular-nums mt-0.5">{formatINR(liveRate)}</p>
                  </div>
                  <div className={cn('rounded-xl p-3 border', metalCost > 0 ? 'bg-amber-950 border-amber-800' : 'bg-gray-50 border-gray-200')}>
                    <p className={cn('text-xs font-medium', metalCost > 0 ? 'text-amber-400' : 'text-gray-400')}>Metal Cost</p>
                    <p className={cn('text-xl font-bold tabular-nums mt-0.5', metalCost > 0 ? 'text-amber-100' : 'text-gray-300')}>
                      {netW > 0 ? formatINR(metalCost) : '—'}
                    </p>
                    {netW > 0 && <p className="text-[10px] text-amber-600 mt-0.5">{netW.toFixed(3)} g × {formatINR(liveRate)}</p>}
                  </div>
                </div>

                {/* Making charges */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Making Charges</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Percentage (%)</Label>
                      <Input
                        type="number" min="0" max="100" step="0.1"
                        placeholder="e.g. 12"
                        className="h-9"
                        value={makingPct}
                        onChange={(e) => { setMakingPct(e.target.value); setMakingFlat('') }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Flat Amount (₹)</Label>
                      <Input
                        type="number" min="0"
                        placeholder="or flat ₹"
                        className="h-9"
                        value={makingFlat}
                        onChange={(e) => { setMakingFlat(e.target.value); setMakingPct('') }}
                      />
                    </div>
                  </div>
                </div>

                {/* Stone + GST */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Stone / Diamond Cost (₹)</Label>
                    <Input
                      type="number" min="0"
                      placeholder="0"
                      className="h-9"
                      value={stoneCost}
                      onChange={(e) => setStoneCost(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">GST %</Label>
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
                    { label: `Metal cost (${netW > 0 ? netW.toFixed(3) + 'g' : '—'})`, value: metalCost },
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
                    type="button"
                    onClick={applyPrice}
                    className="w-full bg-amber-600 hover:bg-amber-700 gap-2 h-11"
                  >
                    <Zap className="h-4 w-4" />
                    Use {formatINR(suggested)} as Selling Price
                  </Button>
                )}
              </CardContent>
            )}
          </Card>
        )}

        {/* ── STEP 5: Product Details ─────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <StepBadge n={5} />
              <CardTitle className="text-sm font-semibold text-gray-800">Product Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Item Name *</Label>
              <Input {...register('item_name')} placeholder="e.g. Diamond Solitaire Ring 22K" className="h-11" />
              {errors.item_name && <p className="text-xs text-red-500">{errors.item_name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>SKU</Label>
                <Input {...register('sku')} placeholder="e.g. RNG-001" />
              </div>
              <div className="space-y-1.5">
                <Label>HSN Code</Label>
                <Input {...register('hsn_code')} placeholder="e.g. 7113" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Selling Price (₹)</Label>
                <Input {...register('selling_price')} type="number" placeholder="0" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label>Purchase Price (₹)</Label>
                <Input {...register('purchase_price')} type="number" placeholder="0" className="h-10" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea {...register('description')} placeholder="Product description..." className="min-h-[80px]" />
            </div>
          </CardContent>
        </Card>

        {/* ── Submit ─────────────────────────────────────────────────────── */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} className="flex-1 sm:flex-none bg-amber-600 hover:bg-amber-700">
            {isPending ? 'Adding...' : 'Add Product'}
          </Button>
        </div>

      </form>
    </div>
  )
}

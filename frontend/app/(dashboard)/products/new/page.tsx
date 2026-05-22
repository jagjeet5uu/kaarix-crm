'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
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
import { useCreateProduct } from '@/hooks/use-products'

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

const METAL_TYPES = [
  { value: 'gold', label: 'Gold' },
  { value: 'platinum', label: 'Platinum' },
  { value: 'silver', label: 'Silver' },
]

const METAL_PURITIES = [
  { value: '14k', label: '14K' },
  { value: '18k', label: '18K' },
  { value: '22k', label: '22K' },
  { value: '24k', label: '24K' },
  { value: '925', label: '925 Silver' },
  { value: '950', label: '950 Platinum' },
]

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

export default function NewProductPage() {
  const router = useRouter()
  const { mutate: createProduct, isPending } = useCreateProduct()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { inventory_status: 'available' },
  })

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
        onSuccess: (res) => {
          router.push('/products/' + res.data.id)
        },
      }
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Add Product"
        actions={
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Item Name *</Label>
              <Input {...register('item_name')} placeholder="Product name" />
              {errors.item_name && (
                <p className="text-xs text-red-500">{errors.item_name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>SKU</Label>
              <Input {...register('sku')} placeholder="e.g. RNG-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select onValueChange={(v) => setValue('category', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Inventory Status</Label>
              <Select
                defaultValue="available"
                onValueChange={(v) => setValue('inventory_status', v)}
              >
                <SelectTrigger>
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
            <div className="space-y-1.5">
              <Label>Selling Price (₹)</Label>
              <Input {...register('selling_price')} type="number" placeholder="0" />
              {errors.selling_price && (
                <p className="text-xs text-red-500">{errors.selling_price.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Purchase Price (₹)</Label>
              <Input {...register('purchase_price')} type="number" placeholder="0" />
              {errors.purchase_price && (
                <p className="text-xs text-red-500">{errors.purchase_price.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Metal & Weight */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Metal &amp; Weight</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Metal Type</Label>
              <Select onValueChange={(v) => setValue('metal_type', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select metal" />
                </SelectTrigger>
                <SelectContent>
                  {METAL_TYPES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Metal Purity</Label>
              <Select onValueChange={(v) => setValue('metal_purity', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select purity" />
                </SelectTrigger>
                <SelectContent>
                  {METAL_PURITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Gross Weight (g)</Label>
              <Input {...register('gross_weight')} type="number" step="0.001" placeholder="0.000" />
              {errors.gross_weight && (
                <p className="text-xs text-red-500">{errors.gross_weight.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Net Weight (g)</Label>
              <Input {...register('net_weight')} type="number" step="0.001" placeholder="0.000" />
              {errors.net_weight && (
                <p className="text-xs text-red-500">{errors.net_weight.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>HSN Code</Label>
              <Input {...register('hsn_code')} placeholder="e.g. 7113" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Textarea
                {...register('description')}
                placeholder="Product description..."
                className="min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} className="bg-amber-600 hover:bg-amber-700">
            {isPending ? 'Adding...' : 'Add Product'}
          </Button>
        </div>
      </form>
    </div>
  )
}

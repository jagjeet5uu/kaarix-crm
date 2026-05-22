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
import { useCreateCustomer } from '@/hooks/use-customers'

const schema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  mobile: z.string().min(10, 'Valid mobile number required'),
  email: z.string().email().optional().or(z.literal('')),
  city: z.string().optional(),
  address: z.string().optional(),
  customer_type: z.enum(['retail', 'wholesale', 'vip']),
  lead_source: z.string().optional(),
  birthday: z.string().optional(),
  anniversary: z.string().optional(),
  preferred_category: z.string().optional(),
  preferred_metal: z.string().optional(),
  preferred_budget_min: z.string().optional(),
  preferred_budget_max: z.string().optional(),
  ring_size: z.string().optional(),
  bracelet_size: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function NewCustomerPage() {
  const router = useRouter()
  const { mutate: createCustomer, isPending } = useCreateCustomer()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { customer_type: 'retail' },
  })

  const onSubmit = (data: FormData) => {
    createCustomer(
      {
        ...data,
        email: data.email || undefined,
        preferred_budget_min: data.preferred_budget_min ? Number(data.preferred_budget_min) : undefined,
        preferred_budget_max: data.preferred_budget_max ? Number(data.preferred_budget_max) : undefined,
      },
      {
        onSuccess: (res) => {
          router.push(`/customers/${res.data.id}`)
        },
      }
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Add Customer"
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
            <CardTitle className="text-sm font-semibold text-gray-700">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input {...register('first_name')} placeholder="First name" />
              {errors.first_name && <p className="text-xs text-red-500">{errors.first_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input {...register('last_name')} placeholder="Last name" />
              {errors.last_name && <p className="text-xs text-red-500">{errors.last_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Mobile *</Label>
              <Input {...register('mobile')} placeholder="+91 XXXXX XXXXX" />
              {errors.mobile && <p className="text-xs text-red-500">{errors.mobile.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input {...register('email')} type="email" placeholder="email@example.com" />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input {...register('city')} placeholder="City" />
            </div>
            <div className="space-y-1.5">
              <Label>Customer Type *</Label>
              <Select
                defaultValue="retail"
                onValueChange={(v) => setValue('customer_type', v as 'retail' | 'wholesale' | 'vip')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Address</Label>
              <Textarea {...register('address')} placeholder="Full address" className="min-h-[70px]" />
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Preferences & Sizes</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Birthday</Label>
              <Input {...register('birthday')} type="date" />
            </div>
            <div className="space-y-1.5">
              <Label>Anniversary</Label>
              <Input {...register('anniversary')} type="date" />
            </div>
            <div className="space-y-1.5">
              <Label>Budget Min (₹)</Label>
              <Input {...register('preferred_budget_min')} type="number" placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Budget Max (₹)</Label>
              <Input {...register('preferred_budget_max')} type="number" placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Ring Size</Label>
              <Input {...register('ring_size')} placeholder="e.g. 12" />
            </div>
            <div className="space-y-1.5">
              <Label>Bracelet Size</Label>
              <Input {...register('bracelet_size')} placeholder="e.g. 6.5 inches" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea {...register('notes')} placeholder="Any additional notes..." className="min-h-[80px]" />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} className="bg-amber-600 hover:bg-amber-700">
            {isPending ? 'Creating...' : 'Create Customer'}
          </Button>
        </div>
      </form>
    </div>
  )
}

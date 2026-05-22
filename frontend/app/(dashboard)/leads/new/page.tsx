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
import { useCreateLead } from '@/hooks/use-leads'
import { LEAD_STAGES, LEAD_SOURCES } from '@/lib/constants'

const schema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  mobile: z.string().min(10, 'Valid mobile number required'),
  email: z.string().email().optional().or(z.literal('')),
  stage: z.string().min(1, 'Stage is required'),
  lead_source: z.string().optional(),
  interested_category: z.string().optional(),
  budget_min: z.string().optional(),
  budget_max: z.string().optional(),
  follow_up_date: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function NewLeadPage() {
  const router = useRouter()
  const { mutate: createLead, isPending } = useCreateLead()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { stage: 'new_inquiry' },
  })

  const onSubmit = (data: FormData) => {
    createLead(
      {
        ...data,
        email: data.email || undefined,
        budget_min: data.budget_min ? Number(data.budget_min) : undefined,
        budget_max: data.budget_max ? Number(data.budget_max) : undefined,
      },
      {
        onSuccess: (res) => {
          router.push('/leads/' + res.data.id)
        },
      }
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="New Lead"
        actions={
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Lead Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Lead Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Customer Name *</Label>
              <Input {...register('customer_name')} placeholder="Full name" />
              {errors.customer_name && (
                <p className="text-xs text-red-500">{errors.customer_name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Mobile *</Label>
              <Input {...register('mobile')} placeholder="+91 XXXXX XXXXX" />
              {errors.mobile && (
                <p className="text-xs text-red-500">{errors.mobile.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input {...register('email')} type="email" placeholder="email@example.com" />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Stage *</Label>
              <Select
                defaultValue="new_inquiry"
                onValueChange={(v) => setValue('stage', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.stage && (
                <p className="text-xs text-red-500">{errors.stage.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Lead Source</Label>
              <Select onValueChange={(v) => setValue('lead_source', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Interested Category</Label>
              <Input
                {...register('interested_category')}
                placeholder="e.g. Rings, Necklaces"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Follow-up Date</Label>
              <Input {...register('follow_up_date')} type="date" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                {...register('notes')}
                placeholder="Any additional notes..."
                className="min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Budget & Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Budget &amp; Preferences</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Budget Min (₹)</Label>
              <Input {...register('budget_min')} type="number" placeholder="0" />
              {errors.budget_min && (
                <p className="text-xs text-red-500">{errors.budget_min.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Budget Max (₹)</Label>
              <Input {...register('budget_max')} type="number" placeholder="0" />
              {errors.budget_max && (
                <p className="text-xs text-red-500">{errors.budget_max.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} className="bg-amber-600 hover:bg-amber-700">
            {isPending ? 'Creating...' : 'Create Lead'}
          </Button>
        </div>
      </form>
    </div>
  )
}

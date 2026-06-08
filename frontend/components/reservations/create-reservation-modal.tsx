'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reservationsAPI } from '@/lib/api'
import { toast } from 'sonner'

const schema = z.object({
  product: z.string().min(1, 'Product is required'),
  customer: z.string().min(1, 'Customer is required'),
  lead: z.string().optional(),
  reserved_until: z.string().min(1, 'Reservation date is required'),
  advance_amount: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface CreateReservationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateReservationModal({ open, onOpenChange }: CreateReservationModalProps) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: Record<string, unknown>) => reservationsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      toast.success('Reservation created successfully')
      reset()
      onOpenChange(false)
    },
    onError: (error: any) => {
      const detail = error?.response?.data
      if (detail && typeof detail === 'object') {
        const msg = Object.entries(detail)
          .map(([f, m]) => `${f}: ${Array.isArray(m) ? m.join(', ') : m}`)
          .join(' | ')
        toast.error(msg)
        console.error('Reservation 400:', detail)
      } else {
        toast.error('Failed to create reservation')
      }
    },
  })

  const onSubmit = (data: FormData) => {
    mutate({
      product: Number(data.product),
      customer: Number(data.customer),
      ...(data.lead ? { lead: Number(data.lead) } : {}),
      // DateTimeField requires full ISO string — append end-of-day time
      reserved_until: data.reserved_until ? `${data.reserved_until}T23:59:00` : undefined,
      ...(data.advance_amount ? { advance_amount: Number(data.advance_amount) } : {}),
      ...(data.notes ? { notes: data.notes } : {}),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Reservation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Product ID *</Label>
              <Input
                {...register('product')}
                placeholder="Enter product ID"
                type="number"
              />
              {errors.product && (
                <p className="text-xs text-red-500">{errors.product.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Customer ID *</Label>
              <Input
                {...register('customer')}
                placeholder="Enter customer ID"
                type="number"
              />
              {errors.customer && (
                <p className="text-xs text-red-500">{errors.customer.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Lead ID (optional)</Label>
              <Input
                {...register('lead')}
                placeholder="Enter lead ID"
                type="number"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Reserve Until *</Label>
              <Input
                {...register('reserved_until')}
                type="date"
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.reserved_until && (
                <p className="text-xs text-red-500">{errors.reserved_until.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Advance Amount (₹)</Label>
            <Input
              {...register('advance_amount')}
              placeholder="0"
              type="number"
              min="0"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              {...register('notes')}
              placeholder="Any additional notes..."
              className="min-h-[80px]"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isPending ? 'Creating...' : 'Create Reservation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

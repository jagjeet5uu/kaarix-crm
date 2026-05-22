'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customersAPI } from '@/lib/api'
import { toast } from 'sonner'

export function useCustomers(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: async () => {
      const res = await customersAPI.list(params)
      return res.data
    },
  })
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: async () => {
      const res = await customersAPI.get(id)
      return res.data
    },
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => customersAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer created successfully')
    },
    onError: () => {
      toast.error('Failed to create customer')
    },
  })
}

export function useUpdateCustomer(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => customersAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer updated successfully')
    },
    onError: () => {
      toast.error('Failed to update customer')
    },
  })
}

export function useCustomerLeads(id: number) {
  return useQuery({
    queryKey: ['customers', id, 'leads'],
    queryFn: async () => {
      const res = await customersAPI.leads(id)
      return res.data
    },
    enabled: !!id,
  })
}

export function useCustomerReservations(id: number) {
  return useQuery({
    queryKey: ['customers', id, 'reservations'],
    queryFn: async () => {
      const res = await customersAPI.reservations(id)
      return res.data
    },
    enabled: !!id,
  })
}

export function useCustomerQuotations(id: number) {
  return useQuery({
    queryKey: ['customers', id, 'quotations'],
    queryFn: async () => {
      const res = await customersAPI.quotations(id)
      return res.data
    },
    enabled: !!id,
  })
}

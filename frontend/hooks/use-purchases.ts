'use client'

import { useQuery } from '@tanstack/react-query'
import { purchasesAPI } from '@/lib/api'

export function useVendors(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['vendors', params],
    queryFn: async () => {
      const res = await purchasesAPI.vendors.list(params)
      return res.data
    },
  })
}

export function useVendor(id: number) {
  return useQuery({
    queryKey: ['vendors', id],
    queryFn: async () => {
      const res = await purchasesAPI.vendors.get(id)
      return res.data
    },
    enabled: !!id,
  })
}

export function useExpenses(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: async () => {
      const res = await purchasesAPI.expenses.list(params)
      return res.data
    },
  })
}

export function useBills(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['bills', params],
    queryFn: async () => {
      const res = await purchasesAPI.bills.list(params)
      return res.data
    },
  })
}

export function useBill(id: number) {
  return useQuery({
    queryKey: ['bills', id],
    queryFn: async () => {
      const res = await purchasesAPI.bills.get(id)
      return res.data
    },
    enabled: !!id,
  })
}

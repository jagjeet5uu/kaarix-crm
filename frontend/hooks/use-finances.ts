'use client'

import { useQuery } from '@tanstack/react-query'
import { financesAPI } from '@/lib/api'

export function useSalesInvoices(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['finances', 'invoices', params],
    queryFn: async () => {
      const res = await financesAPI.invoices.list(params)
      return res.data
    },
  })
}

export function useSalesInvoice(id: number) {
  return useQuery({
    queryKey: ['finances', 'invoices', id],
    queryFn: async () => {
      const res = await financesAPI.invoices.get(id)
      return res.data
    },
    enabled: !!id,
  })
}

export function useCustomerPayments(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['finances', 'customer-payments', params],
    queryFn: async () => {
      const res = await financesAPI.customerPayments.list(params)
      return res.data
    },
  })
}

export function useVendorPayments(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['finances', 'vendor-payments', params],
    queryFn: async () => {
      const res = await financesAPI.vendorPayments.list(params)
      return res.data
    },
  })
}

export function useVendorCredits(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['finances', 'vendor-credits', params],
    queryFn: async () => {
      const res = await financesAPI.vendorCredits.list(params)
      return res.data
    },
  })
}

export function useJournals(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['finances', 'journals', params],
    queryFn: async () => {
      const res = await financesAPI.journals.list(params)
      return res.data
    },
  })
}

export function useDeposits(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['finances', 'deposits', params],
    queryFn: async () => {
      const res = await financesAPI.deposits.list(params)
      return res.data
    },
  })
}

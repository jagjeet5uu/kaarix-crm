'use client'

import { useQuery } from '@tanstack/react-query'
import { reportsAPI } from '@/lib/api'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: async () => {
      const res = await reportsAPI.dashboard()
      return res.data
    },
    refetchInterval: 5 * 60 * 1000, // refetch every 5 minutes
  })
}

export function useInventorySummary() {
  return useQuery({
    queryKey: ['reports', 'inventory_summary'],
    queryFn: async () => {
      const res = await reportsAPI.inventorySummary()
      return res.data
    },
  })
}

export function useStockAging() {
  return useQuery({
    queryKey: ['reports', 'stock_aging'],
    queryFn: async () => {
      const res = await reportsAPI.stockAging()
      return res.data
    },
  })
}

export function useLeadsByStage() {
  return useQuery({
    queryKey: ['reports', 'leads_by_stage'],
    queryFn: async () => {
      const res = await reportsAPI.leadsByStage()
      return res.data
    },
  })
}

export function useFollowUps() {
  return useQuery({
    queryKey: ['reports', 'follow_ups'],
    queryFn: async () => {
      const res = await reportsAPI.followUps()
      return res.data
    },
  })
}

export function useFinancialSummary() {
  return useQuery({
    queryKey: ['reports', 'financial_summary'],
    queryFn: async () => {
      const res = await reportsAPI.financialSummary()
      return res.data
    },
  })
}

export function useSalespersonPerformance() {
  return useQuery({
    queryKey: ['reports', 'salesperson_performance'],
    queryFn: async () => {
      const res = await reportsAPI.salespersonPerformance()
      return res.data
    },
  })
}

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leadsAPI } from '@/lib/api'
import { toast } from 'sonner'

export function useLeads(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: async () => {
      const res = await leadsAPI.list(params)
      return res.data
    },
  })
}

export function useFollowUpsToday() {
  return useQuery({
    queryKey: ['leads', 'follow_ups_today'],
    queryFn: async () => {
      const res = await leadsAPI.followUpsToday()
      return res.data as any[]
    },
  })
}

export function useOverdueFollowUps() {
  return useQuery({
    queryKey: ['leads', 'overdue_follow_ups'],
    queryFn: async () => {
      const res = await leadsAPI.overdueFollowUps()
      return res.data as any[]
    },
  })
}

export function useLead(id: number) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: async () => {
      const res = await leadsAPI.get(id)
      return res.data
    },
    enabled: !!id,
  })
}

export function useLeadActivities(id: number) {
  return useQuery({
    queryKey: ['leads', id, 'activities'],
    queryFn: async () => {
      const res = await leadsAPI.activities(id)
      return res.data
    },
    enabled: !!id,
  })
}

export function useCreateLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => leadsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead created successfully')
    },
    onError: () => {
      toast.error('Failed to create lead')
    },
  })
}

export function useUpdateLead(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => leadsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead updated successfully')
    },
    onError: () => {
      toast.error('Failed to update lead')
    },
  })
}

export function useAddLeadActivity(leadId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => leadsAPI.addActivity(leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', leadId, 'activities'] })
      toast.success('Activity logged')
    },
    onError: () => {
      toast.error('Failed to log activity')
    },
  })
}

export function useCloseWonLead(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data?: Record<string, unknown>) => leadsAPI.closeWon(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead marked as Won')
    },
    onError: () => {
      toast.error('Failed to close lead')
    },
  })
}

export function useCloseLostLead(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => leadsAPI.closeLost(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead marked as Lost')
    },
    onError: () => {
      toast.error('Failed to close lead')
    },
  })
}

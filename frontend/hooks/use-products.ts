'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsAPI } from '@/lib/api'
import { toast } from 'sonner'

export function useProducts(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const res = await productsAPI.list(params)
      return res.data
    },
  })
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const res = await productsAPI.get(id)
      return res.data
    },
    enabled: !!id,
  })
}

export function useAvailableProducts() {
  return useQuery({
    queryKey: ['products', 'available'],
    queryFn: async () => {
      const res = await productsAPI.available()
      return res.data
    },
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => productsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product created successfully')
    },
    onError: () => {
      toast.error('Failed to create product')
    },
  })
}

export function useUpdateProduct(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => productsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product updated successfully')
    },
    onError: (error: any) => {
      // Surface the actual Django validation error so we can debug
      const detail = error?.response?.data
      if (detail && typeof detail === 'object') {
        const messages = Object.entries(detail)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join(' | ')
        toast.error(`Validation error — ${messages}`)
        console.error('Product update 400:', detail)
      } else {
        toast.error('Failed to update product')
      }
    },
  })
}

export function useImportCsv() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) => productsAPI.importCsv(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('CSV import initiated')
    },
    onError: () => {
      toast.error('Failed to import CSV')
    },
  })
}

export function useUploadProductImage(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) => productsAPI.uploadImage(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', id] })
      toast.success('Image uploaded successfully')
    },
    onError: () => {
      toast.error('Failed to upload image')
    },
  })
}

'use client'

import { Gem } from 'lucide-react'
import { ProductCard } from './product-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { Product } from '@/types'

interface ProductGridProps {
  products: Product[]
  isLoading?: boolean
}

export function ProductGrid({ products, isLoading }: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-square w-full" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Gem className="h-12 w-12 mb-3" />
        <p className="text-sm font-medium">No products found</p>
        <p className="text-xs mt-1">Try adjusting your filters</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

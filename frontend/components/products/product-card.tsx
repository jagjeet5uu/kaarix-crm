'use client'

import { memo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Gem } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency } from '@/lib/utils'
import { Product } from '@/types'

interface ProductCardProps {
  product: Product
}

export const ProductCard = memo(function ProductCard({ product }: ProductCardProps) {
  // primary_image is a URL string from list API; images[] is from detail API
  const imageUrl =
    product.primary_image ||
    product.images?.find((img) => img.is_primary)?.file_url ||
    product.images?.[0]?.file_url ||
    null

  return (
    <Link href={`/products/${product.id}`}>
      <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden">
        {/* Image */}
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.item_name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
              <Gem className="h-12 w-12" />
              <p className="text-xs mt-1">{product.category}</p>
            </div>
          )}
          <div className="absolute top-2 right-2">
            <StatusBadge status={product.inventory_status} type="inventory" />
          </div>
        </div>

        <CardContent className="p-3">
          {/* SKU */}
          {product.sku && (
            <p className="text-xs font-mono text-gray-400 mb-1">{product.sku}</p>
          )}

          {/* Name */}
          <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 mb-2">
            {product.item_name}
          </p>

          {/* Category & Metal */}
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
              {product.category}
            </span>
            {product.metal_purity && (
              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                {product.metal_purity}
              </span>
            )}
          </div>

          {/* Price */}
          {product.selling_price && (
            <p className="text-sm font-bold text-gray-900">
              {formatCurrency(product.selling_price)}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
})

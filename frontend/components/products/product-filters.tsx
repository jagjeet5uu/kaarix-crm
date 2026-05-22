'use client'

import { useState } from 'react'
import { Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { PRODUCT_CATEGORIES, INVENTORY_STATUSES, METAL_TYPES, METAL_PURITIES } from '@/lib/constants'
import { cn } from '@/lib/utils'

export interface ProductFilters {
  category?: string
  inventory_status?: string[]
  metal_type?: string
  metal_purity?: string
  min_price?: number
  max_price?: number
  missing_sku?: boolean
  missing_certification?: boolean
  missing_images?: boolean
}

interface ProductFiltersProps {
  filters: ProductFilters
  onChange: (filters: ProductFilters) => void
  className?: string
}

export function ProductFiltersPanel({ filters, onChange, className }: ProductFiltersProps) {
  const [isOpen, setIsOpen] = useState(true)

  const updateFilter = <K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) => {
    onChange({ ...filters, [key]: value })
  }

  const toggleStatus = (status: string) => {
    const current = filters.inventory_status || []
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status]
    updateFilter('inventory_status', updated.length > 0 ? updated : undefined)
  }

  const clearAll = () => onChange({})

  const hasFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true)
  )

  return (
    <div className={cn('bg-white border border-gray-200 rounded-lg', className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Filters</span>
        </div>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <button
              onClick={clearAll}
              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {isOpen ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 space-y-5">
          {/* Category */}
          <div>
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
              Category
            </Label>
            <Select
              value={filters.category || 'all'}
              onValueChange={(v) => updateFilter('category', v === 'all' ? undefined : v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {PRODUCT_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Inventory Status */}
          <div>
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
              Status
            </Label>
            <div className="space-y-2">
              {INVENTORY_STATUSES.map((s) => (
                <div key={s.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`status-${s.value}`}
                    checked={filters.inventory_status?.includes(s.value) || false}
                    onCheckedChange={() => toggleStatus(s.value)}
                  />
                  <label
                    htmlFor={`status-${s.value}`}
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    {s.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Metal Type */}
          <div>
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
              Metal Type
            </Label>
            <Select
              value={filters.metal_type || 'all'}
              onValueChange={(v) => updateFilter('metal_type', v === 'all' ? undefined : v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All metals" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All metals</SelectItem>
                {METAL_TYPES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Metal Purity */}
          <div>
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
              Metal Purity
            </Label>
            <Select
              value={filters.metal_purity || 'all'}
              onValueChange={(v) => updateFilter('metal_purity', v === 'all' ? undefined : v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All purities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All purities</SelectItem>
                {METAL_PURITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price Range */}
          <div>
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
              Price Range (₹)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                className="h-8 text-sm"
                value={filters.min_price || ''}
                onChange={(e) => updateFilter('min_price', e.target.value ? Number(e.target.value) : undefined)}
              />
              <span className="text-gray-400">–</span>
              <Input
                type="number"
                placeholder="Max"
                className="h-8 text-sm"
                value={filters.max_price || ''}
                onChange={(e) => updateFilter('max_price', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
          </div>

          {/* Missing data filters */}
          <div>
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
              Missing Data
            </Label>
            <div className="space-y-2">
              {[
                { key: 'missing_sku', label: 'Missing SKU' },
                { key: 'missing_certification', label: 'Missing Certification' },
                { key: 'missing_images', label: 'Missing Images' },
              ].map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <Checkbox
                    id={item.key}
                    checked={filters[item.key as keyof ProductFilters] as boolean || false}
                    onCheckedChange={(checked) =>
                      updateFilter(item.key as keyof ProductFilters, checked ? true : undefined)
                    }
                  />
                  <label htmlFor={item.key} className="text-sm text-gray-700 cursor-pointer">
                    {item.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

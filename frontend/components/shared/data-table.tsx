'use client'

import { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface Column<T extends object> {
  key: string
  header: string
  render?: (value: unknown, row: T) => ReactNode
  className?: string
  sortable?: boolean
}

interface DataTableProps<T extends object> {
  data: T[]
  columns: Column<T>[]
  isLoading?: boolean
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
  }
  onRowClick?: (row: T) => void
  emptyMessage?: string
  emptyIcon?: ReactNode
}

export function DataTable<T extends object>({
  data,
  columns,
  isLoading = false,
  pagination,
  onRowClick,
  emptyMessage = 'No records found',
  emptyIcon,
}: DataTableProps<T>) {
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap',
                      col.className
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3.5">
                        <Skeleton className="h-4 w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      {emptyIcon && (
                        <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                          {emptyIcon}
                        </div>
                      )}
                      <p className="text-sm font-medium text-gray-500">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr
                    key={i}
                    className={cn(
                      'hover:bg-amber-50/40 transition-colors',
                      onRowClick && 'cursor-pointer'
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn('px-4 py-3.5 text-gray-700', col.className)}
                      >
                        {col.render
                          ? col.render((row as Record<string, unknown>)[col.key], row)
                          : String((row as Record<string, unknown>)[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:justify-between px-1">
          <p className="text-sm text-gray-500">
            Showing{' '}
            <span className="font-medium text-gray-700">
              {((pagination.page - 1) * pagination.pageSize) + 1}–
              {Math.min(pagination.page * pagination.pageSize, pagination.total)}
            </span>{' '}
            of <span className="font-medium text-gray-700">{pagination.total}</span> results
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.page === 1}
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-3 py-1 text-sm font-medium text-gray-700">
              {pagination.page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === totalPages}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => pagination.onPageChange(totalPages)}
              disabled={pagination.page === totalPages}
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface CategoryTotal {
  category: string
  total: number
  available: number
  reserved: number
  sold: number
  total_selling_value?: number
}

interface InventoryChartProps {
  // accepts either the raw API shape or a pre-mapped array
  data?: { category_totals?: CategoryTotal[] } | CategoryTotal[] | null
  isLoading?: boolean
}

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f97316', '#06b6d4', '#84cc16', '#ec4899', '#6366f1']

export function InventoryChart({ data, isLoading }: InventoryChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  // Handle both raw API shape {category_totals: [...]} and plain arrays
  const rawArr: CategoryTotal[] = Array.isArray(data)
    ? data
    : (data as { category_totals?: CategoryTotal[] })?.category_totals ?? []

  const chartData = rawArr.map((item, i) => ({
    name: item.category
      ? item.category.charAt(0).toUpperCase() + item.category.slice(1)
      : 'Unknown',
    value: item.total ?? 0,
    color: COLORS[i % COLORS.length],
  }))

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Inventory by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Inventory by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              formatter={(value: number, name: string) => [value, name]}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span style={{ fontSize: 11, color: '#6b7280' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

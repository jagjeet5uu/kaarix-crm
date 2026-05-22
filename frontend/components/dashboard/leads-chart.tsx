'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface LeadsChartProps {
  data?: Record<string, number>
  isLoading?: boolean
}

const STAGE_CONFIG: Array<{ value: string; label: string; color: string }> = [
  { value: 'new_inquiry',           label: 'New',            color: '#94a3b8' },
  { value: 'contacted',             label: 'Contacted',      color: '#60a5fa' },
  { value: 'requirement_collected', label: 'Req. Collected', color: '#22d3ee' },
  { value: 'products_shared',       label: 'Products Shared',color: '#818cf8' },
  { value: 'shortlisted',           label: 'Shortlisted',    color: '#a78bfa' },
  { value: 'reserved',              label: 'Reserved',       color: '#fbbf24' },
  { value: 'quotation_sent',        label: 'Quote Sent',     color: '#f97316' },
  { value: 'advance_paid',          label: 'Advance Paid',   color: '#34d399' },
  { value: 'closed_won',            label: 'Won',            color: '#10b981' },
  { value: 'closed_lost',           label: 'Lost',           color: '#f87171' },
]

export function LeadsChart({ data, isLoading }: LeadsChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  const chartData = STAGE_CONFIG
    .map((s) => ({ name: s.label, value: data?.[s.value] ?? 0, color: s.color }))
    .filter((d) => d.value > 0)

  const total = chartData.reduce((sum, d) => sum + d.value, 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-800">Leads by Stage</CardTitle>
          <span className="text-xs text-gray-400 font-medium">{total} total</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-60 text-gray-400 text-sm">
            No lead data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 55 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                angle={-40}
                textAnchor="end"
                interval={0}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)',
                }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

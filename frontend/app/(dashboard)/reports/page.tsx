'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, Column } from '@/components/shared/data-table'
import { PageHeader } from '@/components/shared/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw, AlertTriangle, TrendingUp, Package, Users,
  IndianRupee, CalendarClock, Clock, CheckCircle2, XCircle,
} from 'lucide-react'
import {
  useInventorySummary, useLeadsByStage, useStockAging,
  useSalespersonPerformance, useFollowUps, useFinancialSummary,
} from '@/hooks/use-dashboard'
import { useQuery } from '@tanstack/react-query'
import { reportsAPI } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { LEAD_STAGES } from '@/lib/constants'
import Link from 'next/link'

// ── Palette ──────────────────────────────────────────────────────────────────
const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f97316', '#06b6d4', '#84cc16', '#ec4899']

const STATUS_COLOR: Record<string, string> = {
  paid: '#10b981', unpaid: '#f59e0b', overdue: '#ef4444',
  partially_paid: '#f97316', void: '#6b7280', draft: '#94a3b8',
  sent: '#3b82f6', viewed: '#06b6d4', accepted: '#8b5cf6', declined: '#ef4444',
  write_off: '#6b7280',
}

// ── Types ────────────────────────────────────────────────────────────────────

interface CategoryTotal {
  category: string
  total: number
  available: number
  reserved: number
  sold: number
  total_selling_value: number
  avg_price: number
}

interface CategoryStatus {
  category: string
  inventory_status: string
  count: number
  total_value: number
}

interface InventoryResponse {
  category_totals: CategoryTotal[]
  by_category_status: CategoryStatus[]
}

interface LeadStage { stage: string; count: number }
interface LeadsByStageResponse {
  stages: LeadStage[]
  total: number
  closed_won: number
  conversion_rate: number
}

interface AgingItem {
  id: number; item_name: string; sku: string; category: string
  selling_price: string | null; date_of_purchase: string | null; days_in_stock: number | null
}
interface AgingBucket { count: number; items: AgingItem[] }
interface AgingResponse {
  '0-30 days': AgingBucket; '31-90 days': AgingBucket; '91-180 days': AgingBucket
  '181-365 days': AgingBucket; '365+ days': AgingBucket; unknown: AgingBucket
}

interface PerformanceRow {
  assigned_to__id: number; assigned_to__username: string
  assigned_to__first_name: string; assigned_to__last_name: string
  total_leads: number; active_leads: number; won: number; lost: number
  won_this_month: number; follow_ups_pending: number
}

interface FollowUpLead {
  id: number; customer__first_name: string; customer__last_name: string
  customer__mobile: string; stage: string; follow_up_date: string; assigned_to__username: string
}
interface FollowUpsResponse {
  overdue: number; today: number; tomorrow: number; next_7_days: number
  no_follow_up: number; overdue_list: FollowUpLead[]
}

interface InvoiceByStatus { status: string; count: number; amount: number }
interface MonthlyTrend { month: string; invoiced: number; collected: number }
interface FinancialSummaryResponse {
  total_invoiced: number; total_outstanding: number; total_collected: number
  total_vendor_payments: number; total_vendor_credits: number
  total_billed: number; total_payable: number; total_expenses: number
  invoice_by_status: InvoiceByStatus[]
  monthly_trend: MonthlyTrend[]
}

interface SyncError {
  id: number; module: string; direction: string; zoho_id: string
  local_id: number | null; error_message: string; retry_count: number; created_at: string
}
interface SyncErrorsResponse { total_errors: number; errors: SyncError[] }

// ── Helper components ────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, color = 'text-gray-900', icon: Icon,
}: {
  label: string; value: string | number; sub?: string
  color?: string; icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          {Icon && (
            <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Icon className="h-4.5 w-4.5 text-amber-600" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function SectionSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-48 w-full rounded-xl" />
      ))}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { data: inventoryRaw, isLoading: inventoryLoading } = useInventorySummary()
  const { data: leadsByStageRaw, isLoading: leadsLoading } = useLeadsByStage()
  const { data: stockAgingRaw, isLoading: agingLoading } = useStockAging()
  const { data: performanceRaw } = useSalespersonPerformance()
  const { data: followUpsRaw, isLoading: followUpsLoading } = useFollowUps()
  const { data: financialRaw, isLoading: financialLoading } = useFinancialSummary()

  const { data: syncErrorsRaw, isLoading: syncLoading, refetch: refetchSync } = useQuery({
    queryKey: ['reports', 'sync_errors'],
    queryFn: async () => {
      const res = await reportsAPI.syncErrors()
      return res.data as SyncErrorsResponse
    },
  })

  // ── 1. Inventory ──────────────────────────────────────────────────────────
  const inventory = inventoryRaw as InventoryResponse | undefined
  const categoryTotals: CategoryTotal[] = inventory?.category_totals ?? []
  const byCategoryStatus: CategoryStatus[] = inventory?.by_category_status ?? []

  // Build stacked bar data: one entry per category, bars = status
  const stackedCategories = Array.from(new Set(byCategoryStatus.map((r) => r.category))).sort()
  const stackedStatuses = Array.from(new Set(byCategoryStatus.map((r) => r.inventory_status)))
  const stackedBarData = stackedCategories.map((cat) => {
    const row: Record<string, string | number> = { category: cat || 'Uncategorised' }
    byCategoryStatus.filter((r) => r.category === cat).forEach((r) => {
      row[r.inventory_status] = r.count
    })
    return row
  })

  const inventoryPieData = categoryTotals.map((item, i) => ({
    name: item.category || 'Unknown',
    value: item.total,
    fill: COLORS[i % COLORS.length],
  }))

  const inventoryColumns: Column<CategoryTotal>[] = [
    { key: 'category', header: 'Category', render: (v) => <span className="capitalize font-medium">{String(v || '—')}</span> },
    { key: 'total', header: 'Total', render: (v) => <span className="font-bold">{String(v ?? 0)}</span> },
    { key: 'available', header: 'Available', render: (v) => <span className="text-green-600 font-medium">{String(v ?? 0)}</span> },
    { key: 'reserved', header: 'Reserved', render: (v) => <span className="text-amber-600 font-medium">{String(v ?? 0)}</span> },
    { key: 'sold', header: 'Sold', render: (v) => <span className="text-blue-600 font-medium">{String(v ?? 0)}</span> },
    { key: 'total_selling_value', header: 'Total Value', render: (v) => <span className="font-semibold">{formatCurrency(v as number)}</span> },
    { key: 'avg_price', header: 'Avg Price', render: (v) => formatCurrency(v as number) },
  ]

  // ── 2. Leads ──────────────────────────────────────────────────────────────
  const leadsByStage = leadsByStageRaw as LeadsByStageResponse | undefined
  const stageLookup = Object.fromEntries((leadsByStage?.stages ?? []).map((s) => [s.stage, s.count]))
  const leadsChartData = LEAD_STAGES
    .map((stage, i) => ({ name: stage.label, value: stageLookup[stage.value] ?? 0, fill: COLORS[i % COLORS.length] }))
    .filter((d) => d.value > 0)

  // ── 3. Follow-ups ─────────────────────────────────────────────────────────
  const followUps = followUpsRaw as FollowUpsResponse | undefined
  const followUpsLeadColumns: Column<FollowUpLead>[] = [
    {
      key: 'customer__first_name',
      header: 'Customer',
      render: (v, row) => (
        <Link href={`/leads/${row.id}`} className="font-medium text-amber-700 hover:underline">
          {[row.customer__first_name, row.customer__last_name].filter(Boolean).join(' ') || '—'}
        </Link>
      ),
    },
    { key: 'customer__mobile', header: 'Mobile', render: (v) => <span className="font-mono text-xs">{String(v || '—')}</span> },
    { key: 'stage', header: 'Stage', render: (v) => <Badge variant="outline" className="capitalize text-xs">{String(v).replace(/_/g, ' ')}</Badge> },
    {
      key: 'follow_up_date',
      header: 'Follow-up Date',
      render: (v) => {
        const d = v ? formatDate(String(v)) : '—'
        return <span className="text-red-600 font-medium text-xs">{d}</span>
      },
    },
    { key: 'assigned_to__username', header: 'Assigned To', render: (v) => <span className="text-gray-500 text-xs">{String(v || '—')}</span> },
  ]

  // ── 4. Stock Aging ────────────────────────────────────────────────────────
  const stockAging = stockAgingRaw as AgingResponse | undefined
  const AGING_BRACKETS: { key: keyof AgingResponse; label: string; color: string; fill: string }[] = [
    { key: '0-30 days', label: '0–30 days', color: 'text-green-600', fill: '#10b981' },
    { key: '31-90 days', label: '31–90 days', color: 'text-amber-600', fill: '#f59e0b' },
    { key: '91-180 days', label: '91–180 days', color: 'text-orange-600', fill: '#f97316' },
    { key: '181-365 days', label: '181–365 days', color: 'text-red-500', fill: '#ef4444' },
    { key: '365+ days', label: '365+ days', color: 'text-red-700', fill: '#991b1b' },
  ]
  const agingChartData = AGING_BRACKETS.map((b) => ({
    name: b.label,
    count: stockAging?.[b.key]?.count ?? 0,
    fill: b.fill,
  }))
  const allAgingItems: AgingItem[] = Object.values(stockAging ?? {}).flatMap((b) => (b as AgingBucket)?.items ?? [])
  const agingColumns: Column<AgingItem>[] = [
    { key: 'sku', header: 'SKU', render: (v) => <span className="font-mono text-xs">{String(v || '—')}</span> },
    { key: 'item_name', header: 'Product', render: (v) => <span className="font-medium">{String(v)}</span> },
    { key: 'category', header: 'Category', render: (v) => <span className="capitalize">{String(v || '—')}</span> },
    { key: 'selling_price', header: 'Price', render: (v) => formatCurrency(Number(v)) },
    { key: 'date_of_purchase', header: 'Purchased', render: (v) => (v ? formatDate(String(v)) : '—') },
    {
      key: 'days_in_stock',
      header: 'Days in Stock',
      render: (v) => {
        const d = Number(v)
        if (!v && v !== 0) return <span className="text-gray-400">—</span>
        const cls = d > 365 ? 'text-red-700 font-bold' : d > 180 ? 'text-red-500 font-semibold' : d > 90 ? 'text-orange-600' : d > 30 ? 'text-amber-600' : 'text-green-600'
        return <span className={cls}>{d}d</span>
      },
    },
  ]

  // ── 5. Performance ────────────────────────────────────────────────────────
  const performance = (performanceRaw ?? []) as PerformanceRow[]
  const performanceColumns: Column<PerformanceRow>[] = [
    {
      key: 'assigned_to__username',
      header: 'Salesperson',
      render: (v, row) => {
        const name = [row.assigned_to__first_name, row.assigned_to__last_name].filter(Boolean).join(' ')
        return <span className="font-medium">{name || String(v)}</span>
      },
    },
    { key: 'total_leads', header: 'Total', render: (v) => <span className="font-bold">{String(v ?? 0)}</span> },
    { key: 'active_leads', header: 'Active', render: (v) => <span className="text-blue-600">{String(v ?? 0)}</span> },
    { key: 'won', header: 'Won', render: (v) => <span className="text-green-600 font-semibold">{String(v ?? 0)}</span> },
    { key: 'lost', header: 'Lost', render: (v) => <span className="text-red-500">{String(v ?? 0)}</span> },
    { key: 'won_this_month', header: 'Won (30d)', render: (v) => <span className="text-emerald-600 font-medium">{String(v ?? 0)}</span> },
    { key: 'follow_ups_pending', header: 'Follow-ups Due', render: (v) => <span className={Number(v) > 0 ? 'text-amber-600 font-semibold' : 'text-gray-500'}>{String(v ?? 0)}</span> },
    {
      key: 'total_leads',
      header: 'Conversion',
      render: (_, row) => {
        const rate = row.total_leads > 0 ? ((row.won / row.total_leads) * 100).toFixed(1) : '0.0'
        return <span className="text-gray-700 font-medium">{rate}%</span>
      },
    },
  ]

  // ── 6. Financial Summary ──────────────────────────────────────────────────
  const financial = financialRaw as FinancialSummaryResponse | undefined
  const invoicePieData = (financial?.invoice_by_status ?? []).map((s) => ({
    name: s.status.replace(/_/g, ' '),
    value: s.count,
    amount: s.amount,
    fill: STATUS_COLOR[s.status] ?? '#94a3b8',
  }))

  // ── 7. Sync Errors ────────────────────────────────────────────────────────
  const syncErrors = (syncErrorsRaw?.errors ?? []) as SyncError[]
  const totalErrors = syncErrorsRaw?.total_errors ?? 0
  const syncColumns: Column<SyncError>[] = [
    { key: 'module', header: 'Module', render: (v) => <span className="capitalize font-medium">{String(v || '—')}</span> },
    { key: 'direction', header: 'Direction', render: (v) => <span className="capitalize text-xs text-gray-600">{String(v || '—')}</span> },
    { key: 'zoho_id', header: 'Zoho ID', render: (v) => <span className="font-mono text-xs text-gray-500">{String(v || '—')}</span> },
    {
      key: 'error_message',
      header: 'Error',
      render: (v) => (
        <span className="text-xs text-red-600 truncate max-w-xs block" title={String(v || '')}>
          {String(v || '—')}
        </span>
      ),
    },
    { key: 'retry_count', header: 'Retries', render: (v) => <span className="text-gray-500 text-xs">{String(v ?? 0)}</span> },
    { key: 'created_at', header: 'Time', render: (v) => <span className="text-xs">{formatDate(String(v))}</span> },
  ]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Business analytics and insights" />

      <Tabs defaultValue="inventory">
        <TabsList className="flex-wrap h-auto gap-1 p-1 bg-gray-100">
          <TabsTrigger value="inventory" className="gap-1.5 text-xs">
            <Package className="h-3.5 w-3.5" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-1.5 text-xs">
            <TrendingUp className="h-3.5 w-3.5" /> Leads
          </TabsTrigger>
          <TabsTrigger value="followups" className="gap-1.5 text-xs">
            <CalendarClock className="h-3.5 w-3.5" />
            Follow-ups
            {(followUps?.overdue ?? 0) > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
                {followUps!.overdue}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="aging" className="text-xs">Stock Aging</TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" /> Performance
          </TabsTrigger>
          <TabsTrigger value="finances" className="gap-1.5 text-xs">
            <IndianRupee className="h-3.5 w-3.5" /> Finances
          </TabsTrigger>
          <TabsTrigger value="sync" className="gap-1.5 text-xs">
            {totalErrors > 0 && <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />}
            Sync
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════ INVENTORY ═══════════════════════════════════ */}
        <TabsContent value="inventory" className="mt-4 space-y-6">
          {inventoryLoading ? <SectionSkeleton rows={2} /> : (
            <>
              {/* Pie + Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-sm font-semibold">Inventory by Category</CardTitle></CardHeader>
                  <CardContent>
                    {inventoryPieData.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-10">No inventory data</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie data={inventoryPieData} cx="50%" cy="50%" outerRadius={88} dataKey="value" nameKey="name">
                            {inventoryPieData.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v, n) => [v, n]} />
                          <Legend iconSize={10} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">Status Breakdown by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stackedBarData.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-10">No data</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={stackedBarData} margin={{ bottom: 50 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                          <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                          <Tooltip />
                          <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                          {stackedStatuses.map((status, i) => (
                            <Bar key={status} dataKey={status} stackId="a" fill={COLORS[i % COLORS.length]}
                              name={status.replace(/_/g, ' ')} radius={i === stackedStatuses.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Full table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Category Summary — {categoryTotals.length} categories</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable data={categoryTotals} columns={inventoryColumns} isLoading={inventoryLoading} emptyMessage="No inventory data" />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══════════════════ LEADS ═══════════════════════════════════════ */}
        <TabsContent value="leads" className="mt-4 space-y-4">
          {leadsLoading ? <SectionSkeleton rows={2} /> : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <KpiCard label="Total Leads" value={leadsByStage?.total ?? 0} />
                <KpiCard label="Closed Won" value={leadsByStage?.closed_won ?? 0} color="text-green-600" icon={CheckCircle2} />
                <KpiCard label="Conversion Rate" value={`${leadsByStage?.conversion_rate ?? 0}%`} color="text-amber-600" icon={TrendingUp} />
              </div>

              <Card>
                <CardHeader><CardTitle className="text-sm font-semibold">Leads by Stage</CardTitle></CardHeader>
                <CardContent>
                  {leadsChartData.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-10">No leads data available</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={leadsChartData} margin={{ bottom: 70, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} angle={-45} textAnchor="end" interval={0} />
                        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                        <Tooltip formatter={(v) => [v, 'Leads']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                          {leadsChartData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══════════════════ FOLLOW-UPS ══════════════════════════════════ */}
        <TabsContent value="followups" className="mt-4 space-y-4">
          {followUpsLoading ? <SectionSkeleton rows={2} /> : (
            <>
              <div className="grid grid-cols-5 gap-3">
                <KpiCard label="Overdue" value={followUps?.overdue ?? 0} color="text-red-600" icon={XCircle} />
                <KpiCard label="Due Today" value={followUps?.today ?? 0} color="text-amber-600" icon={Clock} />
                <KpiCard label="Tomorrow" value={followUps?.tomorrow ?? 0} color="text-blue-600" />
                <KpiCard label="Next 7 Days" value={followUps?.next_7_days ?? 0} color="text-gray-700" />
                <KpiCard label="No Follow-up Set" value={followUps?.no_follow_up ?? 0} color="text-gray-400" />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Overdue Follow-ups ({followUps?.overdue_list?.length ?? 0} shown)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable
                    data={followUps?.overdue_list ?? []}
                    columns={followUpsLeadColumns}
                    isLoading={followUpsLoading}
                    emptyMessage="No overdue follow-ups 🎉"
                  />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══════════════════ STOCK AGING ══════════════════════════════════ */}
        <TabsContent value="aging" className="mt-4 space-y-4">
          {agingLoading ? <SectionSkeleton rows={2} /> : (
            <>
              <div className="grid grid-cols-2 gap-6">
                {/* Aging distribution chart */}
                <Card>
                  <CardHeader><CardTitle className="text-sm font-semibold">Aging Distribution</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={agingChartData} margin={{ bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip formatter={(v) => [v, 'Products']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={60}>
                          {agingChartData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Summary cards */}
                <div className="grid grid-cols-1 gap-3 content-start">
                  {AGING_BRACKETS.map((b) => (
                    <div key={b.key} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 bg-white">
                      <span className="text-sm text-gray-600">{b.label}</span>
                      <span className={`text-xl font-bold ${b.color}`}>{stockAging?.[b.key]?.count ?? 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">All Available Stock — {allAgingItems.length} items</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable data={allAgingItems} columns={agingColumns} isLoading={agingLoading} emptyMessage="No aging stock data" />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══════════════════ PERFORMANCE ══════════════════════════════════ */}
        <TabsContent value="performance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Salesperson Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable data={performance} columns={performanceColumns} emptyMessage="No performance data" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════ FINANCES ══════════════════════════════════════ */}
        <TabsContent value="finances" className="mt-4 space-y-6">
          {financialLoading ? <SectionSkeleton rows={3} /> : (
            <>
              {/* KPI row — receivables */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Receivables</p>
                <div className="grid grid-cols-3 gap-4">
                  <KpiCard label="Total Invoiced" value={formatCurrency(financial?.total_invoiced ?? 0)} icon={IndianRupee} />
                  <KpiCard label="Collected (Payments)" value={formatCurrency(financial?.total_collected ?? 0)} color="text-green-600" icon={CheckCircle2} />
                  <KpiCard
                    label="Outstanding Balance"
                    value={formatCurrency(financial?.total_outstanding ?? 0)}
                    color={(financial?.total_outstanding ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}
                    icon={AlertTriangle}
                  />
                </div>
              </div>

              {/* KPI row — payables */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Payables</p>
                <div className="grid grid-cols-4 gap-4">
                  <KpiCard label="Total Bills" value={formatCurrency(financial?.total_billed ?? 0)} />
                  <KpiCard label="Amount Payable" value={formatCurrency(financial?.total_payable ?? 0)} color="text-red-500" />
                  <KpiCard label="Vendor Payments Made" value={formatCurrency(financial?.total_vendor_payments ?? 0)} color="text-blue-600" />
                  <KpiCard label="Vendor Credits" value={formatCurrency(financial?.total_vendor_credits ?? 0)} color="text-purple-600" />
                </div>
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Invoice status pie */}
                <Card>
                  <CardHeader><CardTitle className="text-sm font-semibold">Invoice Status Breakdown</CardTitle></CardHeader>
                  <CardContent>
                    {invoicePieData.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-10">No invoice data</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie data={invoicePieData} cx="50%" cy="50%" outerRadius={88} dataKey="value" nameKey="name">
                            {invoicePieData.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v, n, props) => [
                              `${v} invoices — ${formatCurrency(props.payload.amount)}`,
                              String(n),
                            ]}
                          />
                          <Legend iconSize={10} formatter={(v) => <span className="capitalize" style={{ fontSize: 11 }}>{v}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Monthly invoiced vs collected */}
                <Card>
                  <CardHeader><CardTitle className="text-sm font-semibold">Monthly: Invoiced vs Collected</CardTitle></CardHeader>
                  <CardContent>
                    {(financial?.monthly_trend ?? []).length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-10">No monthly data</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={financial?.monthly_trend ?? []} margin={{ bottom: 10, right: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(v) => formatCurrency(v as number)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="invoiced" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Invoiced" />
                          <Line type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Collected" />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Invoice status table */}
              <Card>
                <CardHeader><CardTitle className="text-sm font-semibold">Invoice Status Detail</CardTitle></CardHeader>
                <CardContent>
                  <div className="divide-y divide-gray-100">
                    {(financial?.invoice_by_status ?? []).map((row) => (
                      <div key={row.status} className="flex items-center justify-between py-2.5 px-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: STATUS_COLOR[row.status] ?? '#94a3b8' }}
                          />
                          <span className="capitalize text-sm font-medium">{row.status.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <span className="text-gray-500">{row.count} invoice{row.count !== 1 ? 's' : ''}</span>
                          <span className="font-semibold w-32 text-right">{formatCurrency(row.amount)}</span>
                        </div>
                      </div>
                    ))}
                    {(financial?.invoice_by_status ?? []).length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-6">No invoice data</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══════════════════ SYNC ERRORS ══════════════════════════════════ */}
        <TabsContent value="sync" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${totalErrors > 0 ? 'text-red-500' : 'text-gray-400'}`} />
              <p className="text-sm font-medium text-gray-700">
                {totalErrors > 0 ? `${totalErrors} sync error${totalErrors !== 1 ? 's' : ''}` : 'No sync errors'}
              </p>
            </div>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => refetchSync()}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <DataTable
                data={syncErrors}
                columns={syncColumns}
                isLoading={syncLoading}
                emptyMessage="No sync errors — Zoho integration is healthy ✓"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

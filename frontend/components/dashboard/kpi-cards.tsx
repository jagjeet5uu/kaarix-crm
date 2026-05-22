'use client'

import Link from 'next/link'
import {
  Package, CheckCircle, BookMarked, ShoppingBag,
  TrendingUp, Clock, AlertTriangle, Calendar,
  Users, UserPlus, Trophy, Wrench, ArrowRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { DashboardStats } from '@/types'

interface KpiCardsProps {
  stats?: DashboardStats
  isLoading?: boolean
}

interface KpiCardProps {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  sub?: string
  href?: string
  alert?: boolean
}

function KpiCard({ label, value, icon: Icon, iconBg, iconColor, sub, href, alert }: KpiCardProps) {
  const content = (
    <Card className={`group hover:shadow-md transition-all duration-200 ${alert ? 'ring-1 ring-red-200' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
            <p className={`mt-1 text-2xl font-bold tracking-tight ${alert ? 'text-red-600' : 'text-gray-900'}`}>
              {value}
            </p>
            {sub && <p className="mt-0.5 text-xs text-gray-400 truncate">{sub}</p>}
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
        {href && (
          <div className="mt-3 flex items-center gap-1 text-xs text-gray-400 group-hover:text-amber-600 transition-colors">
            <span>View all</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (href) return <Link href={href}>{content}</Link>
  return content
}

function SkeletonCards({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-7 w-14 mb-1" />
            <Skeleton className="h-3 w-16" />
          </CardContent>
        </Card>
      ))}
    </>
  )
}

export function KpiCards({ stats, isLoading }: KpiCardsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Inventory</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <SkeletonCards count={6} />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Sales & Leads</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SkeletonCards count={4} />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Customers & Operations</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SkeletonCards count={4} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Inventory */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Inventory</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            label="Total Products"
            value={stats?.total_products ?? 0}
            icon={Package}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            href="/products"
          />
          <KpiCard
            label="Available"
            value={stats?.available_products ?? 0}
            icon={CheckCircle}
            iconBg="bg-green-50"
            iconColor="text-green-600"
            href="/products?status=available"
          />
          <KpiCard
            label="Reserved"
            value={stats?.reserved_products ?? 0}
            icon={BookMarked}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            href="/reservations"
          />
          <KpiCard
            label="Sold"
            value={stats?.sold_products ?? 0}
            icon={ShoppingBag}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-600"
          />
          <KpiCard
            label="Returned"
            value={stats?.returned_products ?? 0}
            icon={ShoppingBag}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
          />
          <KpiCard
            label="Inventory Value"
            value={formatCurrency(stats?.inventory_value)}
            icon={Package}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            sub="Available stock"
          />
        </div>
      </div>

      {/* Sales & Leads */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Sales & Leads</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            label="Total Leads"
            value={stats?.total_leads ?? 0}
            icon={TrendingUp}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            sub={`${stats?.active_leads ?? 0} active`}
            href="/leads"
          />
          <KpiCard
            label="Won This Month"
            value={stats?.won_this_month ?? 0}
            icon={Trophy}
            iconBg="bg-green-50"
            iconColor="text-green-600"
            href="/leads?stage=closed_won"
          />
          <KpiCard
            label="Follow-ups Today"
            value={stats?.follow_ups_due_today ?? 0}
            icon={Clock}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            alert={(stats?.follow_ups_due_today ?? 0) > 0}
            href="/leads?follow_up=today"
          />
          <KpiCard
            label="Overdue Follow-ups"
            value={stats?.overdue_follow_ups ?? 0}
            icon={AlertTriangle}
            iconBg="bg-red-50"
            iconColor="text-red-600"
            alert={(stats?.overdue_follow_ups ?? 0) > 0}
            href="/leads?follow_up=overdue"
          />
        </div>
      </div>

      {/* Customers & Operations */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Customers & Operations</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            label="Total Customers"
            value={stats?.total_customers ?? 0}
            icon={Users}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            sub={`+${stats?.new_customers_month ?? 0} this month`}
            href="/customers"
          />
          <KpiCard
            label="Birthdays Today"
            value={stats?.birthdays_today ?? 0}
            icon={Calendar}
            iconBg="bg-pink-50"
            iconColor="text-pink-600"
            href="/customers"
          />
          <KpiCard
            label="Expiring Reservations"
            value={stats?.reservations_expiring_soon ?? 0}
            icon={UserPlus}
            iconBg="bg-orange-50"
            iconColor="text-orange-600"
            alert={(stats?.reservations_expiring_soon ?? 0) > 0}
            href="/reservations"
          />
          <KpiCard
            label="Open Service Requests"
            value={stats?.open_service_requests ?? 0}
            icon={Wrench}
            iconBg="bg-gray-50"
            iconColor="text-gray-600"
            sub={`${stats?.ready_for_delivery ?? 0} ready to deliver`}
            href="/after-sales"
          />
        </div>
      </div>
    </div>
  )
}

'use client'

import { useGoldPrices } from '@/hooks/use-dashboard'
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetalPrice {
  price_troy_oz_inr: number
  change: number
  change_pct: number
  per_gram: Record<string, number>
}

interface GoldPriceData {
  gold: MetalPrice
  silver: MetalPrice
  updated_at: string
  cached?: boolean
}

function formatINR(val: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val)
}

function ChangeIndicator({ change, pct }: { change: number; pct: number }) {
  const up = change > 0
  const flat = change === 0
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-xs font-medium',
      flat ? 'text-gray-400' : up ? 'text-green-600' : 'text-red-500'
    )}>
      {flat ? <Minus className="h-3 w-3" /> : up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? '+' : ''}{pct.toFixed(2)}%
    </span>
  )
}

export function GoldPriceTicker() {
  const { data, isLoading, isError, refetch, isFetching } = useGoldPrices()
  const prices = data as GoldPriceData | undefined

  const GOLD_KARATS = ['24k', '22k', '18k'] as const
  const KARAT_LABELS: Record<string, string> = {
    '24k': '24K', '22k': '22K', '18k': '18K',
  }

  if (isLoading) {
    return (
      <div className="w-full bg-gradient-to-r from-amber-950 to-amber-900 rounded-xl px-4 py-3 flex items-center gap-3">
        <div className="h-3 w-24 bg-amber-800 rounded animate-pulse" />
        <div className="h-3 w-32 bg-amber-800 rounded animate-pulse" />
        <div className="h-3 w-32 bg-amber-800 rounded animate-pulse" />
      </div>
    )
  }

  if (isError || !prices) {
    return (
      <div className="w-full bg-amber-950/60 rounded-xl px-4 py-3 flex items-center justify-between text-amber-400 text-xs">
        <span>Unable to load live gold prices</span>
        <button onClick={() => refetch()} className="hover:text-amber-200 transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="w-full bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 border border-amber-800/40">

      {/* Live badge */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">Live Rates</span>
      </div>

      {/* Divider */}
      <div className="hidden sm:block h-6 w-px bg-amber-800/60" />

      {/* Gold per gram by karat */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <span className="text-amber-400 text-xs font-semibold">🥇 Gold/g</span>
        {GOLD_KARATS.map((k) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className="text-amber-500 text-xs">{KARAT_LABELS[k]}</span>
            <span className="text-amber-100 text-sm font-bold tabular-nums">
              {formatINR(prices.gold.per_gram[k])}
            </span>
          </div>
        ))}
        <ChangeIndicator change={prices.gold.change} pct={prices.gold.change_pct} />
      </div>

      {/* Divider */}
      <div className="hidden sm:block h-6 w-px bg-amber-800/60" />

      {/* Silver per gram */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-gray-400 text-xs font-semibold">🥈 Silver/g</span>
        <span className="text-amber-100 text-sm font-bold tabular-nums">
          {formatINR(prices.silver.per_gram['999'])}
        </span>
        <ChangeIndicator change={prices.silver.change} pct={prices.silver.change_pct} />
      </div>

      {/* Refresh + timestamp */}
      <div className="ml-auto flex items-center gap-2 flex-shrink-0">
        <span className="text-amber-700 text-[10px] hidden md:block">
          {new Date(prices.updated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-amber-600 hover:text-amber-300 transition-colors disabled:opacity-40"
          title="Refresh prices"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
        </button>
      </div>
    </div>
  )
}

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return '—'
  const num = Number(amount)
  if (isNaN(num)) return '—'
  // Indian number formatting: XX,XX,XXX
  const formatted = num.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })
  return `₹${formatted}`
}

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

export function formatWeight(weight: number | undefined | null, unit = 'g'): string {
  if (weight === undefined || weight === null) return '—'
  return `${Number(weight).toFixed(2)} ${unit}`
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

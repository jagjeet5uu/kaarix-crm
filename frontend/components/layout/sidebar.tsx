'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Package,
  Upload,
  BookMarked,
  FileText,
  Wrench,
  BarChart3,
  Settings,
  Gem,
  ChevronDown,
  ChevronRight,
  X,
  Building2,
  Receipt,
  ScrollText,
  CreditCard,
  ArrowUpCircle,
  BadgePercent,
  BookOpen,
  Landmark,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { useState } from 'react'

interface NavItem {
  label: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavItem[]
  roles?: string[]
}

const navSections = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        roles: ['admin', 'sales_manager', 'salesperson', 'inventory_manager', 'accounts', 'service_staff'],
      },
    ],
  },
  {
    title: 'CRM',
    items: [
      {
        label: 'Customers',
        href: '/customers',
        icon: Users,
        roles: ['admin', 'sales_manager', 'salesperson'],
      },
      {
        label: 'Leads',
        href: '/leads',
        icon: TrendingUp,
        roles: ['admin', 'sales_manager', 'salesperson'],
      },
    ],
  },
  {
    title: 'Catalog',
    items: [
      {
        label: 'Products',
        icon: Package,
        roles: ['admin', 'sales_manager', 'salesperson', 'inventory_manager', 'accounts', 'service_staff'],
        children: [
          { label: 'Catalog', href: '/products', icon: Package, roles: ['admin', 'sales_manager', 'salesperson', 'inventory_manager', 'accounts', 'service_staff'] },
          { label: 'Import CSV', href: '/products/import', icon: Upload, roles: ['admin', 'inventory_manager'] },
        ],
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        label: 'Reservations',
        href: '/reservations',
        icon: BookMarked,
        roles: ['admin', 'sales_manager', 'salesperson'],
      },
      {
        label: 'Quotations',
        href: '/quotations',
        icon: FileText,
        roles: ['admin', 'sales_manager', 'salesperson'],
      },
      {
        label: 'After Sales',
        href: '/after-sales',
        icon: Wrench,
        roles: ['admin', 'service_staff'],
      },
    ],
  },
  {
    title: 'Purchases',
    items: [
      {
        label: 'Purchases',
        icon: Building2,
        roles: ['admin', 'accounts'],
        children: [
          { label: 'Vendors', href: '/purchases/vendors', icon: Building2, roles: ['admin', 'accounts'] },
          { label: 'Expenses', href: '/purchases/expenses', icon: Receipt, roles: ['admin', 'accounts'] },
          { label: 'Bills', href: '/purchases/bills', icon: ScrollText, roles: ['admin', 'accounts'] },
        ],
      },
    ],
  },
  {
    title: 'Finances',
    items: [
      {
        label: 'Finances',
        icon: FileText,
        roles: ['admin', 'accounts'],
        children: [
          { label: 'Invoices', href: '/finances/invoices', icon: FileText, roles: ['admin', 'accounts'] },
          { label: 'Customer Payments', href: '/finances/customer-payments', icon: CreditCard, roles: ['admin', 'accounts'] },
          { label: 'Vendor Payments', href: '/finances/vendor-payments', icon: ArrowUpCircle, roles: ['admin', 'accounts'] },
          { label: 'Vendor Credits', href: '/finances/vendor-credits', icon: BadgePercent, roles: ['admin', 'accounts'] },
          { label: 'Journals', href: '/finances/journals', icon: BookOpen, roles: ['admin', 'accounts'] },
          { label: 'Deposits', href: '/finances/deposits', icon: Landmark, roles: ['admin', 'accounts'] },
        ],
      },
    ],
  },
  {
    title: 'Analytics',
    items: [
      {
        label: 'Reports',
        href: '/reports',
        icon: BarChart3,
        roles: ['admin', 'sales_manager', 'accounts'],
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Settings',
        href: '/settings',
        icon: Settings,
        roles: ['admin', 'accounts'],
      },
    ],
  },
]

function NavLink({ item, depth = 0, onClose }: { item: NavItem; depth?: number; onClose?: () => void }) {
  const pathname = usePathname()
  const hasChildren = item.children && item.children.length > 0

  // Auto-open parent if a child is active
  const anyChildActive = item.children?.some(
    (c) => c.href && (pathname === c.href || pathname.startsWith(c.href + '/'))
  ) ?? false
  const [open, setOpen] = useState(anyChildActive)

  const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + '/') : false

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            anyChildActive
              ? 'text-amber-800 bg-amber-50'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          <item.icon className={cn('h-4 w-4 flex-shrink-0', anyChildActive ? 'text-amber-600' : '')} />
          <span className="flex-1 text-left">{item.label}</span>
          {open ? <ChevronDown className="h-3 w-3 opacity-60" /> : <ChevronRight className="h-3 w-3 opacity-60" />}
        </button>
        {open && (
          <div className="ml-3 mt-1 pl-3 border-l border-gray-200 space-y-0.5">
            {item.children!.map((child) => (
              <NavLink key={child.href} item={child} depth={depth + 1} onClose={onClose} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href!}
      onClick={onClose}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-amber-600 text-white shadow-sm'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      <item.icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-white' : '')} />
      <span>{item.label}</span>
    </Link>
  )
}

interface SidebarProps {
  className?: string
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ className, open, onClose }: SidebarProps) {
  const { user } = useAuth()

  return (
    <>
      {/* Mobile backdrop */}
      {onClose && (
        <div
          className={cn(
            'fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity',
            open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          )}
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'w-60 bg-white border-r border-gray-200 flex flex-col h-screen',
          // Mobile: fixed slide-in drawer
          'fixed inset-y-0 left-0 z-50 transform transition-transform duration-300',
          // Desktop: relative, always visible
          'lg:relative lg:translate-x-0 lg:z-auto',
          // Mobile open/closed state
          open ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
      {/* Brand */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-200">
        <div className="h-8 w-8 rounded-lg bg-amber-600 flex items-center justify-center flex-shrink-0">
          <Gem className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-tight">Kaarix CRM</p>
          <p className="text-xs text-gray-500">Jewelry Brand CRM</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden ml-auto p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.roles || !user || item.roles.includes(user.role)
          )
          if (visibleItems.length === 0) return null
          return (
            <div key={section.title}>
              <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {section.title}
              </p>
              <div className="space-y-1">
                {visibleItems.map((item) => (
                  <NavLink key={item.label} item={item} onClose={onClose} />
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200">
        <p className="text-xs text-gray-400 text-center">v1.0.0</p>
      </div>
    </aside>
    </>
  )
}

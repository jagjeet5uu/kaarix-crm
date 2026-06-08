'use client'

import { useRouter } from 'next/navigation'
import { AlertTriangle, Bell, Clock, LogOut, Menu, Phone, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'
import { useOverdueFollowUps, useFollowUpsToday } from '@/hooks/use-leads'
import { getInitials, formatDate } from '@/lib/utils'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  sales_manager: 'Sales Manager',
  salesperson: 'Salesperson',
  inventory_manager: 'Inventory Manager',
  accounts: 'Accounts',
  service_staff: 'Service Staff',
}

interface HeaderProps {
  onMenuToggle?: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth()
  const router = useRouter()

  const { data: overdueLeads = [] } = useOverdueFollowUps()
  const { data: todayLeads = [] } = useFollowUpsToday()

  const overdueCount = overdueLeads.length
  const todayCount = todayLeads.length
  const totalCount = overdueCount + todayCount

  // Combined, capped list for the dropdown (overdue first)
  const notifications = [
    ...overdueLeads.map((l: any) => ({ ...l, _type: 'overdue' as const })),
    ...todayLeads.map((l: any) => ({ ...l, _type: 'today' as const })),
  ].slice(0, 8)

  const displayName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.username
    : 'User'

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden flex-shrink-0"
          onClick={onMenuToggle}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden sm:block">
          <p className="text-sm text-gray-500">Welcome back,</p>
          <p className="font-semibold text-gray-900">{displayName}</p>
        </div>
        {/* Mobile brand name shown when sidebar is closed */}
        <div className="sm:hidden">
          <p className="font-semibold text-gray-900 text-sm">Kaarix CRM</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {totalCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {totalCount > 9 ? '9+' : totalCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="font-semibold text-sm text-gray-900">Notifications</p>
              {totalCount > 0 && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                  {totalCount} pending
                </span>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {totalCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
                  <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center mb-2">
                    <Bell className="h-5 w-5 text-green-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">All caught up!</p>
                  <p className="text-xs mt-0.5">No pending follow-ups</p>
                </div>
              ) : (
                notifications.map((lead: any) => {
                  const isOverdue = lead._type === 'overdue'
                  return (
                    <button
                      key={`${lead._type}-${lead.id}`}
                      onClick={() => router.push(`/leads/${lead.id}`)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors flex items-start gap-3"
                    >
                      <div className={`mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-50' : 'bg-amber-50'}`}>
                        {isOverdue
                          ? <AlertTriangle className="h-4 w-4 text-red-500" />
                          : <Clock className="h-4 w-4 text-amber-500" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {lead.customer_name || `Lead #${lead.id}`}
                          </p>
                          <span className={`text-[10px] font-semibold flex-shrink-0 ${isOverdue ? 'text-red-500' : 'text-amber-600'}`}>
                            {isOverdue ? 'OVERDUE' : 'TODAY'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {lead.follow_up_date && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="h-3 w-3" />
                              {formatDate(lead.follow_up_date)}
                            </span>
                          )}
                          {lead.customer_mobile && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Phone className="h-3 w-3" />
                              {lead.customer_mobile}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {totalCount > 0 && (
              <button
                onClick={() => router.push('/leads')}
                className="w-full px-4 py-2.5 text-center text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-t border-gray-100 transition-colors"
              >
                View all leads →
              </button>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-amber-100 text-amber-800 font-semibold text-sm">
                  {user ? getInitials(displayName) : 'U'}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{displayName}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
                {user?.role && (
                  <span className="inline-block mt-1 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    {ROLE_LABELS[user.role] || user.role}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 text-red-600 focus:text-red-600"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

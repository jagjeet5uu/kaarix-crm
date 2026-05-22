'use client'

import { Bell, LogOut, Menu, User } from 'lucide-react'
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
import { getInitials } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

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
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
        </Button>

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

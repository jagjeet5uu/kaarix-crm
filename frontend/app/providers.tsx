'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/hooks/use-auth'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,       // data stays fresh 5 min — no refetch on nav
            gcTime: 10 * 60 * 1000,          // keep unused cache 10 min
            refetchOnWindowFocus: false,      // stop refetch when alt-tabbing back
            refetchOnReconnect: false,        // stop refetch on network reconnect
            retry: (failureCount, error: unknown) => {
              // Never retry 4xx errors (auth, not-found) — only retry network errors
              const status = (error as { response?: { status?: number } })?.response?.status
              if (status && status >= 400 && status < 500) return false
              return failureCount < 1
            },
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  )
}

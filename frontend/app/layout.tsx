import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Kaarix CRM — Jewelry & Gold Brand Management',
    template: '%s | Kaarix CRM',
  },
  description:
    'Open-source CRM for jewelry brands and gold retailers. Manage customers, leads, products, reservations, quotations, live gold prices, and Zoho Books sync — all in one place.',
  keywords: [
    'jewelry crm',
    'gold crm',
    'jewellery management software',
    'gold shop software',
    'jewelry store management',
    'gold inventory management',
    'jewelry erp',
    'diamond jewelry crm',
    'jewellery brand software',
    'gold retailer crm',
    'jewelry quotation software',
    'live gold price india',
    'mcx gold rate crm',
    'zoho books jewelry',
    'after sales jewelry management',
    'jewelry repair tracking',
    'gold price calculator',
  ],
  authors: [{ name: 'Kaarix CRM' }],
  creator: 'Kaarix CRM',
  openGraph: {
    title: 'Kaarix CRM — Jewelry & Gold Brand Management',
    description:
      'Open-source CRM for jewelry brands. Live gold prices, Kanban leads, product catalog, quotation builder, Zoho Books sync.',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kaarix CRM — Jewelry & Gold Brand Management',
    description:
      'Open-source CRM for jewelry brands. Live gold prices, lead pipeline, quotations, Zoho Books sync.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

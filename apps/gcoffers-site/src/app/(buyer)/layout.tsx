import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import '../(frontend)/styles.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://deals.gcoffers.com'),
  title: 'Gold Coast Buyer Deals',
  description: 'Public buyer/deals pages for Gold Coast Home Buyers.',
  icons: {
    icon: '/assets/favicon.ico',
  },
}

type BuyerLayoutProps = {
  children: ReactNode
}

export default function BuyerLayout({ children }: BuyerLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './styles.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://gcoffers.com'),
  title: 'Gold Coast Home Buyers | Sell Your South Florida House Fast',
  description:
    'Get a fast cash offer for your South Florida house. Gold Coast Home Buyers buys homes across Miami-Dade, Broward, and Palm Beach.',
  icons: {
    icon: '/assets/favicon.ico',
  },
}

type FrontendLayoutProps = {
  children: ReactNode
}

export default function FrontendLayout({ children }: FrontendLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

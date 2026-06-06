import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './styles.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://gcoffers.com'),
  title: 'Gold Coast Home Buyers',
  description: 'Sell your South Florida house fast with a fair cash offer from Gold Coast Home Buyers.',
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

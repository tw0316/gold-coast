import Link from 'next/link'

import { buyerSiteDisclaimer } from '@/lib/buyer/content'

export function BuyerFooter() {
  return (
    <footer className="buyer-footer">
      <div className="container buyer-footer__inner">
        <div className="buyer-footer__top">
          <div className="buyer-footer__brand">
            <span aria-hidden="true">🏠</span>
            <strong>Gold Coast Home Buyers</strong>
          </div>
          <nav className="buyer-footer__links" aria-label="Buyer footer links">
            <Link href="/">Properties</Link>
            <Link href="/join/">Join Buyers List</Link>
            <Link href="/faq/">FAQ</Link>
            <Link href="/privacy-policy/">Privacy Policy</Link>
            <Link href="/terms/">Terms of Service</Link>
          </nav>
        </div>
        <p className="buyer-footer__disclaimer">{buyerSiteDisclaimer}</p>
        <p className="buyer-footer__copy">&copy; 2026 Gold Coast Home Buyers. All rights reserved.</p>
      </div>
    </footer>
  )
}

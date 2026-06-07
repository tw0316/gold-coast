import Link from 'next/link'

import { getSellerHomeContent } from '@/lib/seller/content'
import { sellerPhoneHref, sellerPhoneLabel } from '@/lib/seller/contact'

export function SellerFooter() {
  const content = getSellerHomeContent()

  return (
    <footer className="footer footer--handoff">
      <div className="container">
        <div className="footer--handoff__grid">
          <div className="footer__brand">
            <Link className="footer__logo" href="/" aria-label="Gold Coast Home Buyers home">
              <img src="/assets/logo-full-on-dark.svg" alt="Gold Coast Home Buyers" />
            </Link>
            <p>{content.footer.description}</p>
            <a href={sellerPhoneHref}>{sellerPhoneLabel}</a>
          </div>
          <nav className="footer__cols" aria-label="Footer navigation">
            <div>
              <h2>Sellers</h2>
              <Link href="/#offer">Get a Cash Offer</Link>
              <Link href="/#how-it-works">How It Works</Link>
              <Link href="/#reviews">Reviews</Link>
              <Link href="/#faq">FAQ</Link>
            </div>
            <div>
              <h2>Buyers</h2>
              <Link href="/deals/">View Active Deals</Link>
              <Link href="/deals/#join">Join the Buyers List</Link>
            </div>
            <div>
              <h2>Company</h2>
              <Link href="/about/#why">Why Gold Coast</Link>
              <Link href="/about/#service-area">Service Area</Link>
              <Link href="/about/#contact">Contact</Link>
            </div>
            <div>
              <h2>Legal</h2>
              <Link href="/privacy-policy/">Privacy Policy</Link>
              <Link href="/terms/">Terms of Service</Link>
            </div>
          </nav>
        </div>
        <div className="footer__bottom">
          <span>{content.footer.bottomLeft}</span>
          <span>{content.footer.bottomRight}</span>
        </div>
      </div>
    </footer>
  )
}

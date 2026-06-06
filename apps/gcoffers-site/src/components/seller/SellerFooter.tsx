import Link from 'next/link'

export function SellerFooter() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <img
            src="/assets/logo-goldcoast.png"
            alt="Gold Coast Home Buyers"
            className="footer__logo-img"
          />
          <p className="footer__dba">W &amp; Co LLC, doing business as Gold Coast Home Buyers</p>
        </div>
        <nav className="footer__links" aria-label="Seller legal links">
          <Link href="/privacy-policy/">Privacy Policy</Link>
          <Link href="/terms/">Terms of Service</Link>
          <Link href="/#seller-lead-form">Contact</Link>
        </nav>
        <p className="footer__copy">&copy; 2026 Gold Coast Home Buyers. All rights reserved.</p>
      </div>
    </footer>
  )
}

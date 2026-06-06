import Link from 'next/link'

export function SellerHeader() {
  return (
    <header className="header">
      <div className="container header__inner">
        <Link href="/" className="header__logo" aria-label="Gold Coast Home Buyers home">
          <img
            src="/assets/logo-goldcoast.png"
            alt="Gold Coast Home Buyers"
            className="header__logo-img"
          />
        </Link>
        <nav className="header__nav" aria-label="Primary seller navigation">
          <Link href="/#how-it-works">How It Works</Link>
          <Link href="/#benefits">Why Us</Link>
          <Link href="/#reasons">Seller Situations</Link>
        </nav>
        <div className="header__actions">
          <Link href="/#seller-lead-form" className="btn btn--primary header__cta">
            Get My Cash Offer
          </Link>
        </div>
      </div>
    </header>
  )
}

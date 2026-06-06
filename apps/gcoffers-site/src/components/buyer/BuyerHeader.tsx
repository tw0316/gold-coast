import Link from 'next/link'

export function BuyerHeader() {
  return (
    <header className="buyer-header">
      <div className="container buyer-header__inner">
        <Link href="/" className="buyer-header__logo" aria-label="Gold Coast buyer deals home">
          <span className="buyer-header__logo-mark" aria-hidden="true">
            🏠
          </span>
          <span>
            <strong>Gold Coast</strong>
            <small>Buyer Deals</small>
          </span>
        </Link>
        <nav className="buyer-header__nav" aria-label="Buyer navigation">
          <Link href="/#how-it-works">How It Works</Link>
          <Link href="/#deals">Active Deals</Link>
          <Link href="/faq/">FAQ</Link>
        </nav>
        <Link href="/join/" className="btn btn--primary buyer-header__cta">
          Join Buyers List
        </Link>
      </div>
    </header>
  )
}

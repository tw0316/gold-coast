'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { sellerPhoneHref, sellerPhoneLabel } from '@/lib/seller/contact'

export type SellerNavItem = 'sell' | 'buy' | 'about'

export function SellerHeader({ active = 'sell' }: { active?: SellerNavItem }) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('nav-open', isOpen)

    return () => {
      document.body.classList.remove('nav-open')
    }
  }, [isOpen])

  function closeMenu() {
    setIsOpen(false)
  }

  return (
    <header className="site-header">
      <div className="container nav" aria-label="Primary navigation">
        <Link className="logo" href="/" aria-label="Gold Coast Home Buyers home" onClick={closeMenu}>
          <img src="/assets/logo-full-on-dark.svg" alt="Gold Coast Home Buyers" />
          <span className="logo__text">Gold Coast Home Buyers</span>
        </Link>
        <nav className={`nav__links${isOpen ? ' active' : ''}`} id="primary-nav">
          <Link href="/" aria-current={active === 'sell' ? 'page' : undefined} onClick={closeMenu}>
            Sell
          </Link>
          <Link href="/deals/" aria-current={active === 'buy' ? 'page' : undefined} onClick={closeMenu}>
            Buy
          </Link>
          <Link href="/about/" aria-current={active === 'about' ? 'page' : undefined} onClick={closeMenu}>
            About
          </Link>
        </nav>
        <div className="nav__actions">
          <a className="nav__phone" href={sellerPhoneHref}>
            {sellerPhoneLabel}
          </a>
          <Link className="btn btn--ondark" href="/#offer">
            Get my cash offer
          </Link>
        </div>
        <button
          className="nav__toggle"
          type="button"
          aria-expanded={isOpen}
          aria-controls="primary-nav"
          onClick={() => setIsOpen((open) => !open)}
        >
          Menu
        </button>
      </div>
    </header>
  )
}

'use client'

import { useState } from 'react'
import type { KeyboardEvent } from 'react'

function startOffer(address: string) {
  document.dispatchEvent(new CustomEvent('seller-offer-start', { detail: { address } }))

  const offerSection = document.getElementById('offer')
  offerSection?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  window.setTimeout(() => {
    document.getElementById('property-address')?.focus()
  }, 320)
}

export function SellerHeroAddressBar() {
  const [address, setAddress] = useState('')

  function handleStart() {
    const trimmedAddress = address.trim()
    if (!trimmedAddress) {
      document.getElementById('hero-address')?.focus()
      return
    }

    startOffer(trimmedAddress)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleStart()
    }
  }

  return (
    <div className="address-bar" id="hero-address-form" aria-label="Start your cash offer">
      <span className="address-bar__icon" aria-hidden="true">
        ⌖
      </span>
      <label className="sr-only" htmlFor="hero-address">
        Enter your home address
      </label>
      <input
        id="hero-address"
        name="heroAddress"
        autoComplete="street-address"
        placeholder="Enter your home address"
        value={address}
        onChange={(event) => setAddress(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
      />
      <button className="btn" type="button" onClick={handleStart}>
        Get my cash offer
      </button>
    </div>
  )
}

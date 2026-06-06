'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { SELLER_LEAD_HONEYPOT_FIELD, SELLER_LEAD_POST_TARGET, SELLER_LEAD_SOURCE } from '@/lib/seller/formContract'

type SellerLeadContext = {
  page: string
  referrer: string
  userAgent: string
}

const initialLeadContext: SellerLeadContext = {
  page: '/',
  referrer: '',
  userAgent: '',
}

export function SellerLeadForm() {
  const [leadContext, setLeadContext] = useState<SellerLeadContext>(initialLeadContext)

  useEffect(() => {
    setLeadContext({
      page: `${window.location.pathname}${window.location.search}` || '/',
      referrer: document.referrer || '',
      userAgent: navigator.userAgent || '',
    })
  }, [])

  return (
    <form
      id="seller-lead-form"
      className="seller-form"
      method="post"
      action={SELLER_LEAD_POST_TARGET}
      data-seller-lead-contract="slice-6-s3-first"
    >
      <input type="hidden" name="source" value={SELLER_LEAD_SOURCE} />
      <input type="hidden" name="page" value={leadContext.page} />
      <input type="hidden" name="referrer" value={leadContext.referrer} />
      <input type="hidden" name="userAgent" value={leadContext.userAgent} />
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="seller-lead-website">Leave this field blank</label>
        <input id="seller-lead-website" name={SELLER_LEAD_HONEYPOT_FIELD} type="text" autoComplete="off" tabIndex={-1} />
      </div>

      <div className="form-group">
        <label htmlFor="fullName">Full Name</label>
        <input
          type="text"
          id="fullName"
          name="fullName"
          placeholder="Full Name"
          autoComplete="name"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="address">Property Address</label>
        <input
          type="text"
          id="address"
          name="address"
          placeholder="Property Address"
          autoComplete="street-address"
          required
        />
      </div>

      <div className="form-group form-group--split">
        <div>
          <label htmlFor="phone">Best Phone Number</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            placeholder="Best Phone Number"
            autoComplete="tel"
            inputMode="tel"
            required
          />
        </div>
        <div>
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Email Address"
            autoComplete="email"
            required
          />
        </div>
      </div>

      <div className="form-checkbox">
        <input type="checkbox" id="serviceConsent" name="serviceConsent" value="true" />
        <label htmlFor="serviceConsent">
          I agree to receive service-related calls and SMS messages from Gold Coast Home Buyers,
          including appointment confirmations, property updates, document requests, and follow-ups,
          at the phone number provided. Message frequency varies. Message and data rates may apply.
          Reply STOP to opt out, HELP for help. Consent is not a condition of purchase. I agree to
          the <Link href="/terms/">Terms of Service</Link> and{' '}
          <Link href="/privacy-policy/">Privacy Policy</Link>.
        </label>
      </div>

      <div className="form-checkbox">
        <input type="checkbox" id="marketingConsent" name="marketingConsent" value="true" />
        <label htmlFor="marketingConsent">
          I agree to receive optional marketing and promotional SMS messages from Gold Coast Home
          Buyers, including property opportunities, special offers, and company updates. Consent is
          not a condition of purchase and can be revoked at any time. I agree to the{' '}
          <Link href="/terms/">Terms of Service</Link> and{' '}
          <Link href="/privacy-policy/">Privacy Policy</Link>.
        </label>
      </div>

      <button type="submit" className="btn btn--primary btn--large btn--full">
        Submit
      </button>
      <p className="seller-form__fine-print">
        No obligation. Your consent selections are submitted separately for service and marketing
        messages.
      </p>
    </form>
  )
}

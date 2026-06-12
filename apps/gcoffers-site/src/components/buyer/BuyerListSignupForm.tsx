'use client'

import {
  BUYER_FORM_HONEYPOT_FIELD,
  BUYER_SIGNUP_FORM_CONTRACT,
  BUYER_SIGNUP_POST_TARGET,
  BUYER_SIGNUP_SOURCE,
} from '@/lib/buyer/formContract'

import { useInlineFormSubmit } from '../forms/useInlineFormSubmit'

const areas = ['Miami-Dade', 'Broward', 'Palm Beach']
const buyerTypes = ['Fix and flip', 'Buy and hold', 'Developer', 'Wholesaler / disposition', 'Other']
const priceRanges = ['Under $250K', '$250K - $500K', '$500K - $750K', '$750K+']
const purchaseMethods = ['Cash', 'Hard money', 'Private capital', 'Conventional']
const buyerSignupSuccessMessage = "You're on the list. We'll send deals that match your buy box."

export function BuyerListSignupForm() {
  const { isSubmitting, status, submitForm } = useInlineFormSubmit({
    requireServiceConsentForPhone: true,
    successMessage: buyerSignupSuccessMessage,
  })

  return (
    <form
      className="form-card"
      id="buyer-form"
      action={BUYER_SIGNUP_POST_TARGET}
      method="post"
      data-form="buyer-signup"
      onSubmit={submitForm}
    >
      <h2>Join the buyer list</h2>
      <p className="form-card__note">Lightweight signup. We will follow up for deeper criteria when a match is close.</p>

      <input type="hidden" name="source" value={BUYER_SIGNUP_SOURCE} />
      <input type="hidden" name="contract" value={BUYER_SIGNUP_FORM_CONTRACT} />
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="buyer-form-website">Leave this field blank</label>
        <input id="buyer-form-website" name={BUYER_FORM_HONEYPOT_FIELD} type="text" autoComplete="off" tabIndex={-1} />
      </div>

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="buyer-full-name">Full name</label>
          <input className="input" id="buyer-full-name" name="fullName" autoComplete="name" placeholder="Your name" />
        </div>
        <div className="form-field">
          <label htmlFor="buyer-email">Email</label>
          <input className="input" id="buyer-email" name="email" type="email" autoComplete="email" required placeholder="Email address" />
        </div>
        <div className="form-field">
          <label htmlFor="buyer-phone">Phone <span className="optional">optional</span></label>
          <input className="input" id="buyer-phone" name="phone" type="tel" autoComplete="tel" placeholder="Phone number" />
        </div>
        <div className="form-field">
          <label htmlFor="buyer-type">Buyer type</label>
          <select className="select" id="buyer-type" name="buyerType" defaultValue="">
            <option value="">Select one</option>
            {buyerTypes.map((buyerType) => (
              <option key={buyerType}>{buyerType}</option>
            ))}
          </select>
        </div>
        <div className="form-field form-field--full">
          <span className="form-label" id="buyer-areas-label">Areas of interest</span>
          <div className="option-grid" role="group" aria-labelledby="buyer-areas-label">
            {areas.map((area) => (
              <label className="option-check" key={area}>
                <input type="checkbox" name="areas" value={area} /> {area}
              </label>
            ))}
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="price-range">Price range</label>
          <select className="select" id="price-range" name="priceRange" defaultValue="">
            <option value="">Select one</option>
            {priceRanges.map((priceRange) => (
              <option key={priceRange}>{priceRange}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="purchase-method">Purchase method</label>
          <select className="select" id="purchase-method" name="purchaseMethod" defaultValue="">
            <option value="">Select one</option>
            {purchaseMethods.map((purchaseMethod) => (
              <option key={purchaseMethod}>{purchaseMethod}</option>
            ))}
          </select>
        </div>
        <div className="form-field form-field--full">
          <label className="checkbox" htmlFor="buyer-service-consent">
            <input id="buyer-service-consent" name="serviceConsent" type="checkbox" value="true" />
            <span>
              If I provide a phone number, I agree to receive calls and text messages from Gold Coast Offers LLC about buyer-list
              updates and deal opportunities. Consent is not a condition of purchase. Msg/data rates may apply. Reply STOP to opt out.
            </span>
          </label>
        </div>
        <div className="form-field form-field--full">
          <label className="checkbox" htmlFor="buyer-marketing-consent">
            <input id="buyer-marketing-consent" name="marketingConsent" type="checkbox" value="true" />
            <span>I also agree to receive occasional marketing messages from Gold Coast Offers LLC. Optional.</span>
          </label>
        </div>
      </div>
      <button className="btn btn--block" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Join the buyer list'}
      </button>
      {status.state !== 'idle' ? (
        <p
          className={`form-status active form-status--${status.state === 'error' ? 'error' : status.state === 'success' ? 'success' : 'loading'}`}
          role={status.state === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {status.message}
        </p>
      ) : null}
      <p className="form-card__micro">We will only send deals and follow-ups relevant to your buyer criteria.</p>
    </form>
  )
}

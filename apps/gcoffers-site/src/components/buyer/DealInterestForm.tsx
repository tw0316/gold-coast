'use client'

import type { BuyerPublicDeal } from '@/lib/deals/dealView'
import {
  BUYER_FORM_HONEYPOT_FIELD,
  DEAL_INTEREST_FORM_CONTRACT,
  DEAL_INTEREST_PHONE_CONSENT_CONTRACT,
  DEAL_INTEREST_POST_TARGET,
  DEAL_INTEREST_SOURCE,
} from '@/lib/buyer/formContract'

import { useInlineFormSubmit } from '../forms/useInlineFormSubmit'

type DealInterestFormProps = {
  deal: BuyerPublicDeal
}

const dealInterestSuccessMessage = "Got it. We'll follow up with next steps on this deal."

export function DealInterestForm({ deal }: DealInterestFormProps) {
  const { isSubmitting, status, submitForm } = useInlineFormSubmit({
    requireServiceConsentForPhone: true,
    successMessage: dealInterestSuccessMessage,
  })

  return (
    <form
      id="deal-interest-form"
      className="buyer-form-card buyer-form-card--compact"
      action={DEAL_INTEREST_POST_TARGET}
      method="post"
      data-form="deal-interest"
      onSubmit={submitForm}
    >
      <div className="buyer-form-card__header">
        <p className="eyebrow">Interest CTA</p>
        <h2 id="buyer-interest-title">Interested in this deal?</h2>
        <p>Send a quick request and we will follow up with the next steps for this opportunity.</p>
      </div>

      <input type="hidden" name="dealSlug" value={deal.slug} />
      <input type="hidden" name="source" value={DEAL_INTEREST_SOURCE} />
      <input type="hidden" name="contract" value={DEAL_INTEREST_FORM_CONTRACT} />
      <input type="hidden" name="phoneConsentContract" value={DEAL_INTEREST_PHONE_CONSENT_CONTRACT} />
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="deal-interest-website">Leave this field blank</label>
        <input id="deal-interest-website" name={BUYER_FORM_HONEYPOT_FIELD} type="text" autoComplete="off" tabIndex={-1} />
      </div>

      <div className="form-group form-group--split">
        <div>
          <label htmlFor="deal-interest-full-name">Full name <span className="optional">optional</span></label>
          <input id="deal-interest-full-name" name="fullName" type="text" autoComplete="name" placeholder="Full name" />
        </div>
        <div>
          <label htmlFor="deal-interest-email">Email <span className="required">*</span></label>
          <input id="deal-interest-email" name="email" type="email" autoComplete="email" placeholder="Email address" required />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="deal-interest-phone">Phone <span className="optional">optional</span></label>
        <input id="deal-interest-phone" name="phone" type="tel" autoComplete="tel" placeholder="Phone number" />
      </div>

      <div className="form-checkbox buyer-legal-checkbox">
        <input id="deal-interest-service-consent" name="serviceConsent" type="checkbox" value="true" />
        <label htmlFor="deal-interest-service-consent">
          If I provide a phone number, I consent to receive service-related SMS messages from Gold Coast Offers LLC
          about this deal, availability updates, and transaction communications. Message frequency varies. Message
          and data rates may apply. Reply STOP to opt out. Consent is not a condition of purchase.
        </label>
      </div>

      <div className="form-group">
        <label htmlFor="deal-interest-message">Message <span className="optional">optional</span></label>
        <textarea
          id="deal-interest-message"
          name="message"
          rows={4}
          placeholder="Questions, timeline, funding method, or offer notes"
        />
      </div>

      <button type="submit" className="btn btn--primary btn--large btn--full" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : "I'm Interested — Send Me Details"}
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
      <p className="buyer-form-card__fine-print">
        Exact address is not included unless explicitly approved for public display. Buyer diligence is required.
      </p>
    </form>
  )
}

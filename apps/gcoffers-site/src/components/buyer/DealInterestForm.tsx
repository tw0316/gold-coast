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
  idSuffix: string
}

const dealInterestSuccessMessage = "Got it. We'll follow up with next steps on this offer."

const safeIdPart = (value: string): string => value.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-')

export function DealInterestForm({ deal, idSuffix }: DealInterestFormProps) {
  const { isSubmitting, status, submitForm } = useInlineFormSubmit({
    requireServiceConsentForPhone: true,
    successMessage: dealInterestSuccessMessage,
  })
  const idPart = safeIdPart(idSuffix)
  const fieldId = (name: string) => `deal-interest-${idPart}-${name}`

  return (
    <form
      id={fieldId('form')}
      className="buyer-form-card buyer-form-card--compact buyer-deal-card__offer-form"
      action={DEAL_INTEREST_POST_TARGET}
      method="post"
      data-form="deal-interest"
      onSubmit={submitForm}
    >
      <div className="buyer-form-card__header">
        <p className="eyebrow">Submit offer</p>
        <h2 id={fieldId('title')}>Submit an offer on this deal</h2>
        <p>Send your offer notes and buyer details. We will follow up with next steps for this opportunity.</p>
      </div>

      <input type="hidden" name="dealSlug" value={deal.slug} />
      <input type="hidden" name="source" value={DEAL_INTEREST_SOURCE} />
      <input type="hidden" name="contract" value={DEAL_INTEREST_FORM_CONTRACT} />
      <input type="hidden" name="phoneConsentContract" value={DEAL_INTEREST_PHONE_CONSENT_CONTRACT} />
      <div className="sr-only" aria-hidden="true">
        <label htmlFor={fieldId('website')}>Leave this field blank</label>
        <input id={fieldId('website')} name={BUYER_FORM_HONEYPOT_FIELD} type="text" autoComplete="off" tabIndex={-1} />
      </div>

      <div className="form-group form-group--split">
        <div>
          <label htmlFor={fieldId('full-name')}>Full name <span className="optional">optional</span></label>
          <input id={fieldId('full-name')} name="fullName" type="text" autoComplete="name" placeholder="Full name" />
        </div>
        <div>
          <label htmlFor={fieldId('email')}>Email <span className="required">*</span></label>
          <input id={fieldId('email')} name="email" type="email" autoComplete="email" placeholder="Email address" required />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor={fieldId('phone')}>Phone <span className="optional">optional</span></label>
        <input id={fieldId('phone')} name="phone" type="tel" autoComplete="tel" placeholder="Phone number" />
      </div>

      <div className="form-checkbox buyer-legal-checkbox">
        <input id={fieldId('service-consent')} name="serviceConsent" type="checkbox" value="true" />
        <label htmlFor={fieldId('service-consent')}>
          If I provide a phone number, I consent to receive service-related SMS messages from Gold Coast Offers LLC
          about this deal, availability updates, and transaction communications. Message frequency varies. Message
          and data rates may apply. Reply STOP to opt out. Consent is not a condition of purchase.
        </label>
      </div>

      <div className="form-group">
        <label htmlFor={fieldId('message')}>Offer notes <span className="optional">optional</span></label>
        <textarea
          id={fieldId('message')}
          name="message"
          rows={4}
          placeholder="Offer amount, timeline, funding method, or diligence questions"
        />
      </div>

      <button type="submit" className="btn btn--primary btn--large btn--full" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Submit Offer'}
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
        Public deal numbers are preliminary. Buyer diligence and final seller approval are required.
      </p>
    </form>
  )
}

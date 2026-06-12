'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'

import { SELLER_LEAD_HONEYPOT_FIELD, SELLER_LEAD_POST_TARGET, SELLER_LEAD_SOURCE } from '@/lib/seller/formContract'

import { useInlineFormSubmit } from '../forms/useInlineFormSubmit'

type SellerLeadContext = {
  page: string
  referrer: string
  userAgent: string
}

type SellerLeadErrors = Partial<Record<'address' | 'fullName' | 'phone' | 'email' | 'serviceConsent', boolean>>

type SellerOfferStartEvent = Event & {
  detail?: {
    address?: string
  }
}

const initialLeadContext: SellerLeadContext = {
  page: '/',
  referrer: '',
  userAgent: '',
}

const sellerLeadSuccessMessage = "Got it. We'll review the property and follow up shortly."

function getPhoneDigits(value: FormDataEntryValue | null) {
  return String(value ?? '').replace(/\D/g, '')
}

function isValidEmail(value: FormDataEntryValue | null) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '').trim())
}

function getStepFromErrors(errors: SellerLeadErrors) {
  if (errors.address) {
    return 0
  }

  if (errors.fullName || errors.phone || errors.email || errors.serviceConsent) {
    return 2
  }

  return 0
}

function isInvalidPhone(value: FormDataEntryValue | null) {
  const digits = getPhoneDigits(value)

  return digits.length > 0 && digits.length !== 10
}

export function SellerLeadForm() {
  const [currentStep, setCurrentStep] = useState(0)
  const [leadContext, setLeadContext] = useState<SellerLeadContext>(initialLeadContext)
  const [errors, setErrors] = useState<SellerLeadErrors>({})
  const { isSubmitting, status, submitForm } = useInlineFormSubmit({ successMessage: sellerLeadSuccessMessage })

  const progressSteps = useMemo(() => [0, 1, 2], [])

  useEffect(() => {
    setLeadContext({
      page: window.location.pathname || '/',
      referrer: document.referrer || '',
      userAgent: navigator.userAgent || '',
    })
  }, [])

  useEffect(() => {
    function handleOfferStart(event: Event) {
      const address = (event as SellerOfferStartEvent).detail?.address?.trim()
      const addressInput = document.getElementById('property-address') as HTMLInputElement | null

      if (address && addressInput) {
        addressInput.value = address
        addressInput.dispatchEvent(new Event('input', { bubbles: true }))
        addressInput.dispatchEvent(new Event('change', { bubbles: true }))
      }

      setCurrentStep(0)
      setErrors((previousErrors) => ({ ...previousErrors, address: false }))
    }

    document.addEventListener('seller-offer-start', handleOfferStart)

    return () => {
      document.removeEventListener('seller-offer-start', handleOfferStart)
    }
  }, [])

  function validateAddressStep() {
    const addressInput = document.getElementById('property-address') as HTMLInputElement | null
    const addressInvalid = !addressInput?.value.trim() || addressInput.value.trim().length < 5

    setErrors((previousErrors) => ({ ...previousErrors, address: addressInvalid }))

    if (addressInvalid) {
      addressInput?.focus()
      return false
    }

    return true
  }

  function goToStep(step: number) {
    if (step === 1 && !validateAddressStep()) {
      return
    }

    setCurrentStep(step)
    setErrors({})
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const nextErrors: SellerLeadErrors = {
      address: String(formData.get('address') ?? '').trim().length < 5,
      fullName: String(formData.get('fullName') ?? '').trim().length < 2,
      phone: isInvalidPhone(formData.get('phone')),
      email: !isValidEmail(formData.get('email')),
      serviceConsent: getPhoneDigits(formData.get('phone')).length > 0 && formData.get('serviceConsent') !== 'true',
    }

    const hasErrors = Object.values(nextErrors).some(Boolean)
    setErrors(nextErrors)

    if (!hasErrors) {
      await submitForm(event)
      return
    }

    const nextStep = getStepFromErrors(nextErrors)
    setCurrentStep(nextStep)

    window.setTimeout(() => {
      const firstInvalidId = nextErrors.address
        ? 'property-address'
        : nextErrors.fullName
          ? 'full-name'
          : nextErrors.phone
            ? 'phone'
            : nextErrors.email
              ? 'email'
              : 'service-consent'
      document.getElementById(firstInvalidId)?.focus()
    }, 0)
  }

  return (
    <form
      id="seller-form"
      className="form-card offer-form"
      method="post"
      action={SELLER_LEAD_POST_TARGET}
      noValidate
      data-form="seller-lead"
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="source" value={SELLER_LEAD_SOURCE} />
      <input type="hidden" name="page" value={leadContext.page} />
      <input type="hidden" name="referrer" value={leadContext.referrer} />
      <input type="hidden" name="userAgent" value={leadContext.userAgent} />
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="seller-lead-website">Leave this field blank</label>
        <input id="seller-lead-website" name={SELLER_LEAD_HONEYPOT_FIELD} type="text" autoComplete="off" tabIndex={-1} />
      </div>

      <div className="offer-progress" aria-label="Offer form progress">
        {progressSteps.map((step) => (
          <span className={currentStep >= step ? 'is-active' : undefined} key={step} />
        ))}
      </div>

      <div className={`offer-step${currentStep === 0 ? ' is-active' : ''}`} data-step="0">
        <span className="offer-step__eyebrow">Step 1 of 3</span>
        <h3>Where’s the property?</h3>
        <p className="form-card__note">Enter the address and we’ll pull comps right away.</p>
        <div className="form-field form-field--full">
          <label htmlFor="property-address">Property address</label>
          <input
            className={`input${errors.address ? ' error' : ''}`}
            id="property-address"
            name="address"
            autoComplete="street-address"
            required
            placeholder="3421 NW 14th Ave, Hollywood FL"
            aria-invalid={errors.address ? 'true' : undefined}
            aria-describedby="property-address-error"
          />
          <span className={`error-message${errors.address ? ' active' : ''}`} id="property-address-error">
            Enter a valid property address.
          </span>
        </div>
        <div className="offer-nav">
          <button className="btn offer-next" type="button" onClick={() => goToStep(1)} aria-label="Continue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className={`offer-step${currentStep === 1 ? ' is-active' : ''}`} data-step="1">
        <span className="offer-step__eyebrow">Step 2 of 3</span>
        <h3>A few details about the home.</h3>
        <p className="form-card__note">This helps us underwrite accurately. None of it is binding.</p>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="beds">Beds</label>
            <input className="input" id="beds" name="beds" inputMode="numeric" defaultValue="3" />
          </div>
          <div className="form-field">
            <label htmlFor="baths">Baths</label>
            <input className="input" id="baths" name="baths" inputMode="decimal" defaultValue="2" />
          </div>
          <div className="form-field">
            <label htmlFor="sqft">Approx. square feet</label>
            <input className="input" id="sqft" name="sqft" inputMode="numeric" placeholder="e.g. 1,840" />
          </div>
          <div className="form-field">
            <label htmlFor="condition">Condition</label>
            <select className="select" id="condition" name="condition" defaultValue="Lived in">
              <option>Move-in ready</option>
              <option>Lived in</option>
              <option>Needs work</option>
              <option>Major rehab</option>
              <option>Tenant occupied</option>
            </select>
          </div>
          <div className="form-field form-field--full">
            <label htmlFor="timeline">Ideal timeline</label>
            <select className="select" id="timeline" name="timeline" defaultValue="Within 30 days">
              <option>As soon as possible</option>
              <option>Within 30 days</option>
              <option>Within 90 days</option>
              <option>Just exploring</option>
            </select>
          </div>
        </div>
        <input type="hidden" id="property-type" name="propertyType" value="" />
        <input type="hidden" id="repairs" name="repairs" value="" />
        <div className="offer-nav">
          <button className="btn btn--outline offer-back" type="button" onClick={() => goToStep(0)}>
            Back
          </button>
          <button className="btn offer-next" type="button" onClick={() => goToStep(2)}>
            Continue
          </button>
        </div>
      </div>

      <div className={`offer-step${currentStep === 2 ? ' is-active' : ''}`} data-step="2">
        <span className="offer-step__eyebrow">Step 3 of 3</span>
        <h3>Where should we send your offer?</h3>
        <p className="form-card__note">No call center. Just our acquisitions team, within 24 hours.</p>
        <div className="form-grid">
          <div className="form-field form-field--full">
            <label htmlFor="full-name">Your name</label>
            <input
              className={`input${errors.fullName ? ' error' : ''}`}
              id="full-name"
              name="fullName"
              autoComplete="name"
              required
              placeholder="First and last name"
              aria-invalid={errors.fullName ? 'true' : undefined}
              aria-describedby="full-name-error"
            />
            <span className={`error-message${errors.fullName ? ' active' : ''}`} id="full-name-error">
              Enter your name.
            </span>
          </div>
          <div className="form-field">
            <label htmlFor="phone">Phone <span className="optional">Optional</span></label>
            <input
              className={`input${errors.phone ? ' error' : ''}`}
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="(###) ###-####"
              aria-invalid={errors.phone ? 'true' : undefined}
              aria-describedby="phone-error"
            />
            <span className={`error-message${errors.phone ? ' active' : ''}`} id="phone-error">
              Enter a 10-digit phone number or leave it blank.
            </span>
          </div>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              className={`input${errors.email ? ' error' : ''}`}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you at email dot com"
              aria-invalid={errors.email ? 'true' : undefined}
              aria-describedby="email-error"
            />
            <span className={`error-message${errors.email ? ' active' : ''}`} id="email-error">
              Enter a valid email.
            </span>
          </div>
          <div className="form-field form-field--full">
            <label className="checkbox" htmlFor="service-consent">
              <input id="service-consent" name="serviceConsent" type="checkbox" value="true" />
              <span>
                If I provide a phone number, I agree to receive service-related SMS messages (appointment
                confirmations, property updates, document requests, follow-ups) from Gold Coast Offers LLC at the
                number above. Automated messages may be used; frequency varies; message &amp; data rates may apply.
                Reply STOP to opt out, HELP for help. Consent is not a condition of purchase.
              </span>
            </label>
            <span className={`error-message${errors.serviceConsent ? ' active' : ''}`} id="service-consent-error">
              Service SMS consent is required when a phone number is provided.
            </span>
          </div>
          <div className="form-field form-field--full">
            <label className="checkbox" htmlFor="marketing-consent">
              <input id="marketing-consent" name="marketingConsent" type="checkbox" value="true" />
              <span>
                I agree to receive marketing SMS messages from Gold Coast Offers LLC (property opportunities, offers,
                company updates). Frequency varies; message &amp; data rates may apply. Reply STOP to opt out.
                Consent is not a condition of purchase.
              </span>
            </label>
          </div>
        </div>
        <p className="form-card__micro form-card__micro--left">
          By submitting you agree to our <Link href="/terms/">Terms of Service</Link> and{' '}
          <Link href="/privacy-policy/">Privacy Policy</Link>.
        </p>
        <div className="offer-nav">
          <button className="btn btn--outline offer-back" type="button" onClick={() => goToStep(1)}>
            Back
          </button>
          <button className="btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Get my cash offer'}
          </button>
        </div>
        {status.state !== 'idle' ? (
          <p
            className={`form-status active form-status--${status.state === 'error' ? 'error' : status.state === 'success' ? 'success' : 'loading'}`}
            role={status.state === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >
            {status.message}
          </p>
        ) : null}
      </div>
    </form>
  )
}

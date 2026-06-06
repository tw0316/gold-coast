import { buyerSignupOptions } from '@/lib/buyer/content'
import {
  BUYER_FORM_HONEYPOT_FIELD,
  BUYER_SIGNUP_FORM_CONTRACT,
  BUYER_SIGNUP_POST_TARGET,
  BUYER_SIGNUP_SOURCE,
} from '@/lib/buyer/formContract'

export function BuyerSignupForm() {
  return (
    <form
      id="buyer-signup-form"
      className="buyer-form-card"
      action={BUYER_SIGNUP_POST_TARGET}
      method="post"
      data-buyer-signup-contract="email-required-progressive-fields"
      data-s3-first-contract="buyer-signup"
    >
      <div className="buyer-form-card__header">
        <p className="eyebrow">Buyer list</p>
        <h1>Join Our Buyers List</h1>
        <p>
          Email is the only required field. Add your name, phone, areas, strategy, property types, price range,
          and purchase method as progressive buy-box details when you are ready.
        </p>
      </div>

      <input type="hidden" name="source" value={BUYER_SIGNUP_SOURCE} />
      <input type="hidden" name="contract" value={BUYER_SIGNUP_FORM_CONTRACT} />
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="buyer-signup-website">Leave this field blank</label>
        <input id="buyer-signup-website" name={BUYER_FORM_HONEYPOT_FIELD} type="text" autoComplete="off" tabIndex={-1} />
      </div>

      <div className="form-group">
        <label htmlFor="buyer-signup-email">Email <span className="required">*</span></label>
        <input
          id="buyer-signup-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Email address"
          required
        />
      </div>

      <div className="form-group form-group--split">
        <div>
          <label htmlFor="buyer-signup-full-name">Full name <span className="optional">optional</span></label>
          <input id="buyer-signup-full-name" name="fullName" type="text" autoComplete="name" placeholder="Full name" />
        </div>
        <div>
          <label htmlFor="buyer-signup-phone">Phone <span className="optional">optional</span></label>
          <input id="buyer-signup-phone" name="phone" type="tel" autoComplete="tel" placeholder="Phone number" />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="buyer-signup-buyer-type">What best describes you? <span className="optional">optional</span></label>
        <select id="buyer-signup-buyer-type" name="buyerType" defaultValue="">
          <option value="">Select one...</option>
          {buyerSignupOptions.buyerTypes.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="buyer-fieldset">
        <legend>Areas you buy in <span className="optional">optional</span></legend>
        <div className="buyer-checkbox-grid">
          {buyerSignupOptions.areas.map((option) => (
            <label className="buyer-check-pill" key={option.value}>
              <input type="checkbox" name="areas" value={option.value} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="buyer-fieldset">
        <legend>Property types <span className="optional">optional</span></legend>
        <div className="buyer-checkbox-grid">
          {buyerSignupOptions.propertyTypes.map((option) => (
            <label className="buyer-check-pill" key={option.value}>
              <input type="checkbox" name="propertyTypes" value={option.value} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="form-group form-group--split">
        <div>
          <label htmlFor="buyer-signup-price-range">Price range <span className="optional">optional</span></label>
          <select id="buyer-signup-price-range" name="priceRange" defaultValue="">
            <option value="">Select range...</option>
            {buyerSignupOptions.priceRanges.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="buyer-signup-purchase-method">Purchase method <span className="optional">optional</span></label>
          <select id="buyer-signup-purchase-method" name="purchaseMethod" defaultValue="">
            <option value="">Select method...</option>
            {buyerSignupOptions.purchaseMethods.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-checkbox buyer-legal-checkbox">
        <input id="buyer-signup-service-consent" name="serviceConsent" type="checkbox" value="true" />
        <label htmlFor="buyer-signup-service-consent">
          If I provide a phone number, I consent to receive service-related SMS messages from Gold Coast Home Buyers,
          including deal alerts, availability updates, and transaction communications. Message frequency varies.
          Message and data rates may apply. Reply STOP to opt out. Consent is not a condition of purchase.
        </label>
      </div>

      <div className="form-checkbox buyer-legal-checkbox">
        <input id="buyer-signup-marketing-consent" name="marketingConsent" type="checkbox" value="true" />
        <label htmlFor="buyer-signup-marketing-consent">
          I also consent to occasional marketing messages about new deals, market updates, and investor resources.
          This checkbox is optional and not pre-checked.
        </label>
      </div>

      <button type="submit" className="btn btn--primary btn--large btn--full">
        Join Buyers List
      </button>
      <p className="buyer-form-card__fine-print">
        This baseline defines the form contract only. The future route must write to S3 first before any CRM,
        alerting, or admin mirror side effects.
      </p>
    </form>
  )
}

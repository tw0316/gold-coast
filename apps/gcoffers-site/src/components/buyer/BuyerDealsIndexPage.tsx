import { SellerFooter } from '@/components/seller/SellerFooter'
import { SellerHeader } from '@/components/seller/SellerHeader'
import {
  BUYER_FORM_HONEYPOT_FIELD,
  BUYER_SIGNUP_FORM_CONTRACT,
  BUYER_SIGNUP_POST_TARGET,
  BUYER_SIGNUP_SOURCE,
} from '@/lib/buyer/formContract'

const areas = ['Miami-Dade', 'Broward', 'Palm Beach']
const buyerTypes = ['Fix and flip', 'Buy and hold', 'Developer', 'Wholesaler / disposition', 'Other']
const priceRanges = ['Under $250K', '$250K - $500K', '$500K - $750K', '$750K+']
const purchaseMethods = ['Cash', 'Hard money', 'Private capital', 'Conventional']

export function BuyerDealsIndexPage() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <SellerHeader active="buy" />
      <main id="main" data-buyer-page="staging-deals-index">
        <section className="deals-hero">
          <div className="container">
            <span className="eyebrow eyebrow--dark">For our buyer list · Updated weekly</span>
            <h1 className="h1">Off-market deals, underwritten by us.</h1>
            <p className="lede on-dark">
              Curated single-family and small multifamily opportunities in South Florida. We source direct, walk the property, and
              underwrite the deal before it reaches buyers.
            </p>
          </div>
        </section>

        <section className="deals-shell" aria-label="Current deal map and list">
          <div className="map-panel" aria-hidden="true">
            <div className="map-card">
              <span className="map-pin pin-palm">Palm Beach</span>
              <span className="map-pin pin-broward">Broward</span>
              <span className="map-pin pin-miami">Miami-Dade</span>
              <div className="map-card__copy">
                <strong>South Florida coverage</strong>
                <p>Miami-Dade, Broward, and Palm Beach County. Active deal pins will show here when inventory is available.</p>
              </div>
            </div>
          </div>
          <div className="deal-list">
            <div className="count-bar">
              <div>
                <strong>0 active deals</strong>
                <span className="deal-count-region">South Florida</span>
              </div>
              <div className="pill-row" aria-label="Deal filters">
                <button className="pill" type="button" aria-pressed="true">All</button>
                {areas.map((area) => (
                  <button className="pill" type="button" key={area}>{area}</button>
                ))}
              </div>
            </div>
            <div className="empty-deals">
              <div className="empty-deals__icon">⌂</div>
              <h2>No active deals right now</h2>
              <p className="lede">
                We are under contract on new inventory. Join the buyer list and you will hear about the next one before it posts here.
              </p>
              <a className="btn" href="#join">Join the buyer list</a>
            </div>
          </div>
        </section>

        <section className="section buyer-cta" id="join">
          <div className="container split">
            <div>
              <span className="eyebrow eyebrow--dark">Buyer list</span>
              <h2>Get new deals before they are gone.</h2>
              <p className="lede on-dark">
                We send deal alerts to serious cash and hard-money buyers when inventory matches their box.
              </p>
              <ul className="check-list on-dark">
                <li>Direct-to-seller South Florida opportunities.</li>
                <li>Single-family, small multifamily, condos, townhomes, and land.</li>
                <li>No fake inventory. If nothing is active, we say so.</li>
              </ul>
            </div>
            <BuyerListSignupForm />
          </div>
        </section>
      </main>
      <SellerFooter />
    </>
  )
}

function BuyerListSignupForm() {
  return (
    <form
      className="form-card"
      id="buyer-form"
      action={BUYER_SIGNUP_POST_TARGET}
      method="post"
      data-buyer-signup-contract="email-required-progressive-fields"
      data-s3-first-contract="buyer-signup"
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
              If I provide a phone number, I agree to receive calls and text messages from Gold Coast Home Buyers about buyer-list
              updates and deal opportunities. Consent is not a condition of purchase. Msg/data rates may apply. Reply STOP to opt out.
            </span>
          </label>
        </div>
        <div className="form-field form-field--full">
          <label className="checkbox" htmlFor="buyer-marketing-consent">
            <input id="buyer-marketing-consent" name="marketingConsent" type="checkbox" value="true" />
            <span>I also agree to receive occasional marketing messages from Gold Coast Home Buyers. Optional.</span>
          </label>
        </div>
      </div>
      <button className="btn btn--block" type="submit">Join the buyer list</button>
      <p className="form-card__micro">Your signup is persisted through the same S3-first buyer intake contract.</p>
    </form>
  )
}

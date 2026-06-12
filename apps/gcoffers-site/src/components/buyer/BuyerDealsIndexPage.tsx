import { SellerFooter } from '@/components/seller/SellerFooter'
import { SellerHeader } from '@/components/seller/SellerHeader'
import type { BuyerPublicDeal } from '@/lib/deals/dealView'

import { BuyerDealCard } from './BuyerDealCard'
import { BuyerListSignupForm } from './BuyerListSignupForm'

const areas = ['Miami-Dade', 'Broward', 'Palm Beach']

type BuyerDealsIndexPageProps = {
  activeDeals: BuyerPublicDeal[]
}

export function BuyerDealsIndexPage({ activeDeals }: BuyerDealsIndexPageProps) {
  const activeCount = activeDeals.length

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <SellerHeader active="buy" />
      <main id="main" data-buyer-page="deals-index">
        <section className="deals-hero">
          <div className="container">
            <span className="eyebrow eyebrow--dark">For our buyer list · Updated weekly</span>
            <h1 className="h1">
              Off-market deals,
              <br />
              underwritten by us.
            </h1>
            <p className="lede on-dark">
              Curated residential opportunities across our markets, directly sourced from motivated sellers. Every deal comes with
              comparable sales data, rental comps, and a straightforward contract. We underwrite and share each deal directly with
              you before it hits the market.
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
                <strong>{activeCount} active deal{activeCount === 1 ? '' : 's'}</strong>
                <span className="deal-count-region">South Florida</span>
              </div>
              <div className="pill-row" aria-label="Deal filters">
                <button className="pill" type="button" aria-pressed="true">All</button>
                {areas.map((area) => (
                  <button className="pill" type="button" key={area}>{area}</button>
                ))}
              </div>
            </div>
            {activeCount > 0 ? (
              <div className="buyer-deals-grid">
                {activeDeals.map((deal) => (
                  <BuyerDealCard deal={deal} key={deal.id} />
                ))}
              </div>
            ) : (
              <div className="empty-deals">
                <div className="empty-deals__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <path d="M9 22V12h6v10" />
                  </svg>
                </div>
                <h2>No active deals right now</h2>
                <p className="lede">
                  We are under contract on new inventory. Join the buyer list and you will hear about the next one before it posts here.
                </p>
                <a className="btn" href="#join">Join the buyer list</a>
              </div>
            )}
          </div>
        </section>

        <section className="section buyer-cta" id="join">
          <div className="container split">
            <div>
              <span className="eyebrow eyebrow--dark">Buyer list</span>
              <h2>Get new deals before they are gone.</h2>
              <p className="lede on-dark">
                We send deal alerts to investors when inventory matches their box.
              </p>
              <ul className="check-list on-dark">
                <li>Direct-to-seller opportunities.</li>
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

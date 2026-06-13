import { SellerFooter } from '@/components/seller/SellerFooter'
import { SellerHeader } from '@/components/seller/SellerHeader'
import type { BuyerPublicDeal } from '@/lib/deals/dealView'

import { BuyerDealsExplorer } from './BuyerDealsExplorer'
import { BuyerSignupForm } from './BuyerSignupForm'

type BuyerDealsIndexPageProps = {
  activeDeals: BuyerPublicDeal[]
}

export function BuyerDealsIndexPage({ activeDeals }: BuyerDealsIndexPageProps) {
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

        <BuyerDealsExplorer activeDeals={activeDeals} />

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
            <BuyerSignupForm />
          </div>
        </section>
      </main>
      <SellerFooter />
    </>
  )
}

import Link from 'next/link'

import { buyerHomeContent } from '@/lib/buyer/content'
import type { BuyerPublicDeal } from '@/lib/deals/dealView'
import type { SiteSurface } from '@/lib/routing/hosts'

import { BuyerDealCard } from './BuyerDealCard'
import { BuyerEmailCapture } from './BuyerEmailCapture'
import { BuyerFooter } from './BuyerFooter'
import { BuyerHeader } from './BuyerHeader'

type BuyerHomePageProps = {
  routeSurface: SiteSurface
  activeDeals: BuyerPublicDeal[]
  soldDeals: BuyerPublicDeal[]
}

export function BuyerHomePage({ routeSurface, activeDeals, soldDeals }: BuyerHomePageProps) {
  return (
    <div className="buyer-site" data-route-surface={routeSurface} data-buyer-page="home">
      <BuyerHeader />
      <main>
        <section className="buyer-hero" aria-labelledby="buyer-hero-title">
          <div className="container buyer-hero__layout">
            <div className="buyer-hero__copy">
              <p className="eyebrow">{buyerHomeContent.hero.eyebrow}</p>
              <h1 id="buyer-hero-title">{buyerHomeContent.hero.heading}</h1>
              <p className="buyer-hero__subheading">{buyerHomeContent.hero.subheading}</p>
              <BuyerEmailCapture />
              <p className="buyer-hero__microcopy">{buyerHomeContent.hero.microTrust}</p>
              <div className="buyer-trust-pills" aria-label="Buyer deal benefits">
                {buyerHomeContent.hero.trustPills.map((pill) => (
                  <span className="trust-pill" key={pill}>
                    {pill}
                  </span>
                ))}
              </div>
            </div>
            <div className="buyer-hero__panel" aria-label="Buyer deal safety commitments">
              <div className="buyer-hero__panel-card">
                <span aria-hidden="true">🔎</span>
                <h2>Public deal data, private details protected</h2>
                <p>
                  Active and sold proof sections render only public-visible deals. Exact addresses and hidden media stay
                  protected by default.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="buyer-section" id="how-it-works" aria-labelledby="buyer-how-title">
          <div className="container text-center">
            <p className="eyebrow">Simple Process</p>
            <h2 id="buyer-how-title">How It Works</h2>
            <p className="section-subtitle">Three low-friction steps for public browsing and buyer-list growth.</p>
            <div className="buyer-steps-grid">
              {buyerHomeContent.howItWorks.map((step, index) => (
                <article className="buyer-info-card" key={step.title}>
                  <div className="step__number">{index + 1}</div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="buyer-section buyer-section--alt" id="deals" aria-labelledby="buyer-active-deals-title">
          <div className="container">
            <div className="buyer-section__header">
              <p className="eyebrow">Active Deal Listing</p>
              <h2 id="buyer-active-deals-title">Available Properties</h2>
              <p>
                Only public deals with status coming soon, available, or under contract render in this active listing.
              </p>
            </div>
            {activeDeals.length > 0 ? (
              <div className="buyer-deals-grid">
                {activeDeals.map((deal) => (
                  <BuyerDealCard deal={deal} key={deal.id} />
                ))}
              </div>
            ) : (
              <div className="buyer-empty-state">
                <div aria-hidden="true">🏗️</div>
                <h3>Deals Coming Soon</h3>
                <p>Join the buyer list to be ready when public inventory goes live.</p>
                <Link href="/join/" className="btn btn--primary">
                  Join Buyers List
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="buyer-section" aria-labelledby="buyer-sold-title">
          <div className="container">
            <div className="buyer-section__header">
              <p className="eyebrow">Social Proof</p>
              <h2 id="buyer-sold-title">Deals We&apos;ve Closed</h2>
              <p>Sold proof renders only public deals with status sold. These opportunities are no longer active.</p>
            </div>
            {soldDeals.length > 0 ? (
              <div className="buyer-deals-grid buyer-deals-grid--sold">
                {soldDeals.map((deal) => (
                  <BuyerDealCard deal={deal} mode="sold" key={deal.id} />
                ))}
              </div>
            ) : (
              <div className="buyer-empty-state buyer-empty-state--compact">
                <h3>Closed proof coming soon</h3>
                <p>Public sold proof will appear here after a deal is safely marked public and sold.</p>
              </div>
            )}
          </div>
        </section>

        <section className="buyer-section buyer-section--alt" aria-labelledby="buyer-value-title">
          <div className="container text-center">
            <p className="eyebrow">Why Gold Coast?</p>
            <h2 id="buyer-value-title">Built for serious South Florida buyers</h2>
            <p className="section-subtitle">A focused public deal surface without accounts, address leakage, or live alerts in this slice.</p>
            <div className="buyer-value-grid">
              {buyerHomeContent.valueProps.map((valueProp) => (
                <article className="buyer-info-card" key={valueProp.title}>
                  <div className="buyer-info-card__icon" aria-hidden="true">
                    {valueProp.icon}
                  </div>
                  <h3>{valueProp.title}</h3>
                  <p>{valueProp.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="buyer-section" aria-labelledby="buyer-personas-title">
          <div className="container text-center">
            <p className="eyebrow">Buyer Personas</p>
            <h2 id="buyer-personas-title">Whether you&apos;re a...</h2>
            <p className="section-subtitle">Use the public deal pages as a starting point, then complete your own underwriting.</p>
            <div className="buyer-persona-grid">
              {buyerHomeContent.personas.map((persona) => (
                <article className="buyer-info-card" key={persona.title}>
                  <div className="buyer-info-card__icon" aria-hidden="true">
                    {persona.icon}
                  </div>
                  <h3>{persona.title}</h3>
                  <p>{persona.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="buyer-bottom-cta" aria-labelledby="buyer-bottom-cta-title">
          <div className="container">
            <h2 id="buyer-bottom-cta-title">{buyerHomeContent.cta.heading}</h2>
            <p>{buyerHomeContent.cta.text}</p>
            <div className="buyer-bottom-cta__actions">
              <Link href={buyerHomeContent.cta.href} className="btn btn--primary btn--large">
                {buyerHomeContent.cta.label}
              </Link>
              <BuyerEmailCapture className="buyer-email-capture--inline" source="cta" />
            </div>
          </div>
        </section>
      </main>
      <BuyerFooter />
    </div>
  )
}

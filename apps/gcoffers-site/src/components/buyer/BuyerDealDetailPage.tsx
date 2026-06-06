import Link from 'next/link'

import { buyerDueDiligenceDisclaimer } from '@/lib/buyer/content'
import {
  getDealTypeLabel,
  isDealOpenForInterest,
  type BuyerPublicDeal,
} from '@/lib/deals/publicBuyerDeals'

import { BuyerFooter } from './BuyerFooter'
import { BuyerHeader } from './BuyerHeader'
import { DealInterestForm } from './DealInterestForm'

const moneyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 0,
  style: 'currency',
})

const numberFormatter = new Intl.NumberFormat('en-US')

const formatMoney = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? moneyFormatter.format(value) : 'Verify independently'

const formatNumber = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? numberFormatter.format(value) : 'Verify independently'

const formatPercent = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)}%` : 'Verify independently'

type BuyerDealDetailPageProps = {
  deal: BuyerPublicDeal
}

export function BuyerDealDetailPage({ deal }: BuyerDealDetailPageProps) {
  const potentialProfit = deal.financials.potentialProfitOverride ?? deal.calculatedFinancials.potentialProfit
  const potentialROI = deal.financials.potentialROIOverride ?? deal.calculatedFinancials.potentialROI
  const canExpressInterest = isDealOpenForInterest(deal)

  return (
    <div className="buyer-site" data-buyer-page="deal-detail" data-deal-slug={deal.slug}>
      <BuyerHeader />
      <main>
        <section className="buyer-detail-hero" aria-labelledby="buyer-deal-title">
          <div className="container buyer-detail-hero__layout">
            <div className={`buyer-detail-hero__visual buyer-detail-hero__visual--${deal.heroVisual.tone}`}>
              <span aria-hidden="true">{deal.heroVisual.icon}</span>
              <p>{deal.heroVisual.label}</p>
            </div>
            <div className="buyer-detail-hero__content">
              <Link href="/#deals" className="buyer-text-link">
                ← Back to public deals
              </Link>
              <div className="buyer-detail-hero__badges">
                <span className={`buyer-badge buyer-badge--${deal.dealStatus.replaceAll('_', '-')}`}>
                  {deal.statusLabel}
                </span>
                <span className="buyer-badge buyer-badge--type">{getDealTypeLabel(deal.dealType)}</span>
              </div>
              <h1 id="buyer-deal-title">{deal.title}</h1>
              <p className="buyer-detail-hero__location">{deal.locationLabel || 'South Florida'}</p>
              {deal.exactAddress ? (
                <p className="buyer-detail-hero__exact-address">Exact public address: {deal.exactAddress}</p>
              ) : (
                <p className="buyer-detail-hero__address-note">
                  Exact address is hidden by default and is not rendered unless explicitly approved for public display.
                </p>
              )}
              <p className="buyer-detail-hero__summary">{deal.summary}</p>
            </div>
          </div>
        </section>

        <section className="buyer-section buyer-section--alt" aria-labelledby="buyer-deal-numbers-title">
          <div className="container buyer-detail-grid">
            <article className="buyer-detail-card">
              <p className="eyebrow">Deal Numbers</p>
              <h2 id="buyer-deal-numbers-title">Numbers Breakdown</h2>
              <dl className="buyer-detail-metrics">
                <div>
                  <dt>Asking Price</dt>
                  <dd>{formatMoney(deal.financials.askingPrice)}</dd>
                </div>
                <div>
                  <dt>ARV</dt>
                  <dd>{formatMoney(deal.financials.arv)}</dd>
                </div>
                <div>
                  <dt>Estimated Rehab</dt>
                  <dd>{formatMoney(deal.financials.estimatedRehab)}</dd>
                </div>
                <div>
                  <dt>Estimated Closing Costs</dt>
                  <dd>{formatMoney(deal.financials.estimatedClosingCosts)}</dd>
                </div>
                <div>
                  <dt>Total Investment</dt>
                  <dd>{formatMoney(deal.calculatedFinancials.totalInvestment)}</dd>
                </div>
                <div>
                  <dt>Potential Profit</dt>
                  <dd>{formatMoney(potentialProfit)}</dd>
                </div>
                <div>
                  <dt>Potential ROI</dt>
                  <dd>{formatPercent(potentialROI)}</dd>
                </div>
              </dl>
              <p className="buyer-detail-card__note">All numbers are placeholders and must be verified by the buyer.</p>
            </article>

            <article className="buyer-detail-card">
              <p className="eyebrow">Property Details</p>
              <h2>Public Specs</h2>
              <dl className="buyer-detail-list">
                <div>
                  <dt>Property Type</dt>
                  <dd>{deal.propertyDetails.propertyType}</dd>
                </div>
                <div>
                  <dt>Beds / Baths</dt>
                  <dd>
                    {formatNumber(deal.propertyDetails.beds)} / {formatNumber(deal.propertyDetails.baths)}
                  </dd>
                </div>
                <div>
                  <dt>Square Feet</dt>
                  <dd>{formatNumber(deal.propertyDetails.sqft)}</dd>
                </div>
                <div>
                  <dt>Lot Size</dt>
                  <dd>{deal.propertyDetails.lotSize ?? 'Verify independently'}</dd>
                </div>
                <div>
                  <dt>Year Built</dt>
                  <dd>{formatNumber(deal.propertyDetails.yearBuilt)}</dd>
                </div>
                <div>
                  <dt>Construction</dt>
                  <dd>{deal.propertyDetails.construction ?? 'Verify independently'}</dd>
                </div>
                <div>
                  <dt>Occupancy</dt>
                  <dd>{deal.propertyDetails.occupancy ?? 'Verify independently'}</dd>
                </div>
              </dl>
            </article>
          </div>
        </section>

        <section className="buyer-section" aria-labelledby="buyer-rehab-title">
          <div className="container buyer-detail-grid buyer-detail-grid--wide">
            <article className="buyer-detail-card">
              <p className="eyebrow">Scope</p>
              <h2 id="buyer-rehab-title">Rehab Scope</h2>
              <p>{deal.rehabScope}</p>
            </article>
            <article className="buyer-detail-card buyer-detail-card--warning">
              <p className="eyebrow">Due Diligence</p>
              <h2>Buyer verification required</h2>
              <p>{buyerDueDiligenceDisclaimer}</p>
              <p>{deal.disclaimer}</p>
            </article>
          </div>
        </section>

        <section className="buyer-section buyer-section--alt" aria-labelledby="buyer-interest-title">
          <div className="container buyer-detail-interest">
            {canExpressInterest ? (
              <DealInterestForm deal={deal} />
            ) : (
              <article className="buyer-detail-card text-center">
                <p className="eyebrow">Closed Deal</p>
                <h2 id="buyer-interest-title">This public proof deal is sold</h2>
                <p>Join the buyer list to hear about future public inventory.</p>
                <Link href="/join/" className="btn btn--primary">
                  Join Buyers List
                </Link>
              </article>
            )}
          </div>
        </section>
      </main>
      <BuyerFooter />
    </div>
  )
}

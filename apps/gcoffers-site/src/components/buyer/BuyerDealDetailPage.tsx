import Link from 'next/link'

import { buyerDueDiligenceDisclaimer } from '@/lib/buyer/content'
import { isDealOpenForInterest, type BuyerPublicDeal } from '@/lib/deals/dealView'

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
  const { propertyDetails, financials } = deal
  const hasRentalSnapshot =
    financials.marketRent !== null || financials.currentRent !== null || deal.capRate !== null

  return (
    <div className="buyer-site" data-buyer-page="deal-detail" data-deal-slug={deal.slug}>
      <BuyerHeader />
      <main>
        <section className="buyer-detail-hero" aria-labelledby="buyer-deal-title">
          <div className="container buyer-detail-hero__layout">
            <div className={`buyer-detail-hero__visual buyer-detail-hero__visual--${deal.heroVisual.tone}`}>
              {deal.coverPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={deal.coverPhoto.url}
                  alt={deal.coverPhoto.alt ?? deal.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <>
                  <span aria-hidden="true">{deal.heroVisual.icon}</span>
                  <p>{deal.heroVisual.label}</p>
                </>
              )}
            </div>
            <div className="buyer-detail-hero__content">
              <Link href="/#deals" className="buyer-text-link">
                ← Back to public deals
              </Link>
              <div className="buyer-detail-hero__badges">
                <span className={`buyer-badge buyer-badge--${deal.dealStatus.replaceAll('_', '-')}`}>
                  {deal.statusLabel}
                </span>
                {deal.bestUseLabels.map((use) => (
                  <span className="buyer-badge buyer-badge--type" key={use}>
                    {use}
                  </span>
                ))}
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
              {deal.featureTagLabels.length > 0 ? (
                <ul className="buyer-detail-hero__tags" aria-label="Deal highlights">
                  {deal.featureTagLabels.map((tag) => (
                    <li className="buyer-badge buyer-badge--tag" key={tag}>
                      {tag}
                    </li>
                  ))}
                </ul>
              ) : null}
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
                  <dd>{formatMoney(financials.askingPrice)}</dd>
                </div>
                <div>
                  <dt>ARV</dt>
                  <dd>{formatMoney(financials.arv)}</dd>
                </div>
                <div>
                  <dt>Estimated Rehab</dt>
                  <dd>{formatMoney(financials.estimatedRehab)}</dd>
                </div>
                <div>
                  <dt>Estimated Closing Costs</dt>
                  <dd>{formatMoney(financials.estimatedClosingCosts)}</dd>
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
                  <dd>{propertyDetails.propertyTypeLabel ?? 'Verify independently'}</dd>
                </div>
                {propertyDetails.units !== null ? (
                  <div>
                    <dt>Units</dt>
                    <dd>{formatNumber(propertyDetails.units)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Beds / Baths</dt>
                  <dd>
                    {formatNumber(propertyDetails.beds)} / {formatNumber(propertyDetails.baths)}
                  </dd>
                </div>
                <div>
                  <dt>Square Feet</dt>
                  <dd>{formatNumber(propertyDetails.sqft)}</dd>
                </div>
                <div>
                  <dt>Lot Size</dt>
                  <dd>{propertyDetails.lotSize ?? 'Verify independently'}</dd>
                </div>
                <div>
                  <dt>Year Built</dt>
                  <dd>{formatNumber(propertyDetails.yearBuilt)}</dd>
                </div>
                <div>
                  <dt>Construction</dt>
                  <dd>{propertyDetails.construction ?? 'Verify independently'}</dd>
                </div>
                <div>
                  <dt>Occupancy</dt>
                  <dd>{propertyDetails.occupancy ?? 'Verify independently'}</dd>
                </div>
              </dl>
            </article>
          </div>
        </section>

        {hasRentalSnapshot || deal.videoTourUrl ? (
          <section className="buyer-section" aria-labelledby="buyer-rental-title">
            <div className="container buyer-detail-grid buyer-detail-grid--wide">
              {hasRentalSnapshot ? (
                <article className="buyer-detail-card">
                  <p className="eyebrow">Rental Snapshot</p>
                  <h2 id="buyer-rental-title">Buy-and-hold numbers</h2>
                  <dl className="buyer-detail-metrics">
                    <div>
                      <dt>Market Rent (monthly)</dt>
                      <dd>{formatMoney(financials.marketRent)}</dd>
                    </div>
                    {financials.currentRent !== null ? (
                      <div>
                        <dt>Current Rent (monthly)</dt>
                        <dd>{formatMoney(financials.currentRent)}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>Est. Cap Rate</dt>
                      <dd>{formatPercent(deal.capRate)}</dd>
                    </div>
                  </dl>
                  <p className="buyer-detail-card__note">
                    Rent and cap-rate figures are estimates. Confirm rents, expenses, taxes, and insurance independently.
                  </p>
                </article>
              ) : null}
              {deal.videoTourUrl ? (
                <article className="buyer-detail-card">
                  <p className="eyebrow">Walkthrough</p>
                  <h2>Video / Tour</h2>
                  <p>Review the walkthrough before requesting more detail.</p>
                  <a className="btn btn--secondary" href={deal.videoTourUrl} target="_blank" rel="noopener noreferrer">
                    Open video tour
                  </a>
                </article>
              ) : null}
            </div>
          </section>
        ) : null}

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

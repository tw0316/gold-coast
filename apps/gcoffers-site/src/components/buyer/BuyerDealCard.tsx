import Link from 'next/link'

import type { BuyerPublicDeal } from '@/lib/deals/dealView'

const moneyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 0,
  style: 'currency',
})

const numberFormatter = new Intl.NumberFormat('en-US')

const formatMoney = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? moneyFormatter.format(value) : 'Verify'

const formatNumber = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? numberFormatter.format(value) : 'Verify'

const formatPercent = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)}%` : 'Verify'

const getSpecs = (deal: BuyerPublicDeal): string => {
  const specs = [
    deal.propertyDetails.propertyTypeLabel,
    deal.propertyDetails.units ? `${deal.propertyDetails.units} Units` : null,
    deal.propertyDetails.beds ? `${deal.propertyDetails.beds} Bed` : null,
    deal.propertyDetails.baths ? `${deal.propertyDetails.baths} Bath` : null,
    deal.propertyDetails.sqft ? `${formatNumber(deal.propertyDetails.sqft)} sqft` : null,
  ]

  return specs.filter((spec): spec is string => Boolean(spec)).join(' · ')
}

type BuyerDealCardProps = {
  deal: BuyerPublicDeal
  mode?: 'active' | 'sold'
}

export function BuyerDealCard({ deal, mode = 'active' }: BuyerDealCardProps) {
  const potentialROI = deal.financials.potentialROIOverride ?? deal.calculatedFinancials.potentialROI
  const potentialProfit = deal.financials.potentialProfitOverride ?? deal.calculatedFinancials.potentialProfit
  const badgeUse = deal.bestUseLabels.slice(0, 2)

  return (
    <article className={`buyer-deal-card buyer-deal-card--${mode}`} data-deal-slug={deal.slug}>
      <Link href={`/deals/${deal.slug}/`} className="buyer-deal-card__link-wrap">
        <div className={`buyer-deal-card__visual buyer-deal-card__visual--${deal.heroVisual.tone}`}>
          {deal.coverPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={deal.coverPhoto.thumbnailURL ?? deal.coverPhoto.url}
              alt={deal.coverPhoto.alt ?? deal.title}
              className="buyer-deal-card__image"
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <>
              <span aria-hidden="true">{deal.heroVisual.icon}</span>
              <small>{deal.heroVisual.label}</small>
            </>
          )}
          <div className="buyer-deal-card__badges" aria-label="Deal badges">
            <span className={`buyer-badge buyer-badge--${deal.dealStatus.replaceAll('_', '-')}`}>
              {deal.statusLabel}
            </span>
            {badgeUse.map((use) => (
              <span className="buyer-badge buyer-badge--type" key={use}>
                {use}
              </span>
            ))}
          </div>
        </div>
        <div className="buyer-deal-card__body">
          <p className="buyer-deal-card__location">{deal.locationLabel || 'South Florida'}</p>
          <h3>{deal.title}</h3>
          <p className="buyer-deal-card__specs">{getSpecs(deal)}</p>
          <p className="buyer-deal-card__summary">{deal.summary}</p>
          <dl className="buyer-deal-card__numbers">
            <div>
              <dt>{mode === 'sold' ? 'Closed Price' : 'Asking Price'}</dt>
              <dd>{formatMoney(deal.financials.closedPrice ?? deal.financials.askingPrice)}</dd>
            </div>
            <div>
              <dt>ARV</dt>
              <dd>{formatMoney(deal.financials.arv)}</dd>
            </div>
            <div>
              <dt>Est. Rehab</dt>
              <dd>{formatMoney(deal.financials.estimatedRehab)}</dd>
            </div>
            <div>
              <dt>{mode === 'sold' ? 'Close Date' : 'Potential ROI'}</dt>
              <dd>{mode === 'sold' ? 'Closed' : formatPercent(potentialROI)}</dd>
            </div>
          </dl>
          {mode !== 'sold' && potentialProfit !== null ? (
            <p className="buyer-deal-card__profit">Estimated profit before buyer verification: {formatMoney(potentialProfit)}</p>
          ) : null}
          <span className="buyer-deal-card__cta">View Details →</span>
        </div>
      </Link>
    </article>
  )
}

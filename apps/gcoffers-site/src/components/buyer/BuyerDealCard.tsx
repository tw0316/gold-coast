'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { type FocusEvent, type Ref, useEffect, useId, useRef, useState } from 'react'

import { southFloridaCountyLabelFor } from '@/lib/deals/taxonomy'

import type { BuyerDealComp, BuyerPublicDeal } from '@/lib/deals/dealView'

const DealInterestFormLoading = () => (
  <p className="form-status active form-status--loading" role="status">
    Loading offer form...
  </p>
)

const DealInterestForm = dynamic(
  () => import('./DealInterestForm').then((module) => ({ default: module.DealInterestForm })),
  { loading: DealInterestFormLoading, ssr: false },
)

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

const formatOccupancy = (value: string | null | undefined): string => {
  if (!value) {
    return 'Verify'
  }

  return value.replaceAll('_', ' ')
}

const getSpecs = (deal: BuyerPublicDeal): string => {
  const specs = [
    deal.propertyDetails.propertyTypeLabel,
    deal.propertyDetails.units ? `${deal.propertyDetails.units} Units` : null,
    deal.propertyDetails.beds ? `${deal.propertyDetails.beds} Bed` : null,
    deal.propertyDetails.baths ? `${deal.propertyDetails.baths} Bath` : null,
    deal.propertyDetails.sqft ? `${formatNumber(deal.propertyDetails.sqft)} sqft` : null,
    deal.propertyDetails.yearBuilt ? `Built ${deal.propertyDetails.yearBuilt}` : null,
  ]

  return specs.filter((spec): spec is string => Boolean(spec)).join(' · ')
}

const getPotentialProfit = (deal: BuyerPublicDeal): number | null =>
  deal.financials.potentialProfitOverride ?? deal.calculatedFinancials.potentialProfit

const getPotentialROI = (deal: BuyerPublicDeal): number | null =>
  deal.financials.potentialROIOverride ?? deal.calculatedFinancials.potentialROI

const CompList = ({ emptyLabel, items, title }: { emptyLabel: string; items: BuyerDealComp[]; title: string }) => (
  <div className="buyer-deal-card__comp-block">
    <h4>{title}</h4>
    {items.length > 0 ? (
      <ul>
        {items.map((item, index) => (
          <li key={item.id ?? `${index}-${item.label}-${item.value}`}>
            <strong>{item.label}</strong>
            <span>{item.value}</span>
            {item.note ? <small>{item.note}</small> : null}
          </li>
        ))}
      </ul>
    ) : (
      <p>{emptyLabel}</p>
    )}
  </div>
)

type BuyerDealCardProps = {
  cardRef?: Ref<HTMLElement>
  deal: BuyerPublicDeal
  inlineDetails?: boolean
  isActive?: boolean
  mode?: 'active' | 'sold'
  onFocus?: () => void
  onHover?: () => void
  onLeave?: () => void
  onSelect?: (selected: boolean) => void
}

export function BuyerDealCard({
  cardRef,
  deal,
  inlineDetails = false,
  isActive = false,
  mode = 'active',
  onFocus,
  onHover,
  onLeave,
  onSelect,
}: BuyerDealCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const [shouldScrollToOffer, setShouldScrollToOffer] = useState(false)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const offerFormRef = useRef<HTMLDivElement | null>(null)
  const detailsId = useId()
  const potentialProfit = getPotentialProfit(deal)
  const potentialROI = getPotentialROI(deal)
  const badgeUse = deal.bestUseLabels.slice(0, 2)
  const displayAddress = (deal.exactAddress ?? deal.locationLabel) || deal.title
  const displayCounty = deal.county
    ? southFloridaCountyLabelFor(deal.county) ?? deal.county.replace(/ county$/i, '').trim()
    : 'South Florida'
  const secondaryTitle = displayAddress !== deal.title ? deal.title : deal.locationLabel
  const canSubmitOffer = mode !== 'sold' && deal.dealStatus !== 'sold'
  const mediaUrl = deal.coverPhoto?.thumbnailURL ?? deal.coverPhoto?.url ?? null
  const showCoverPhoto = Boolean(deal.coverPhoto && mediaUrl && !imageFailed)

  useEffect(() => {
    const image = imageRef.current

    if (image?.complete && image.naturalWidth === 0) {
      setImageFailed(true)
    }
  }, [mediaUrl])

  useEffect(() => {
    if (!inlineDetails || !isExpanded || !shouldScrollToOffer) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      offerFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      offerFormRef.current?.focus({ preventScroll: true })
      setShouldScrollToOffer(false)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [inlineDetails, isExpanded, shouldScrollToOffer])

  const setCardExpanded = (expanded: boolean) => {
    setIsExpanded(expanded)
    onSelect?.(expanded)
  }

  const expandCard = () => {
    setShouldScrollToOffer(true)
    setCardExpanded(true)
  }

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget

    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return
    }

    onLeave?.()
  }

  return (
    <article
      ref={cardRef}
      className={`buyer-deal-card buyer-deal-card--${mode}${isActive ? ' buyer-deal-card--is-active' : ''}`}
      data-deal-slug={deal.slug}
      data-status={deal.dealStatus}
      onBlur={handleBlur}
      onFocus={onFocus}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div className="buyer-deal-card__media">
        {showCoverPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imageRef}
            src={mediaUrl ?? ''}
            alt={deal.coverPhoto?.alt ?? deal.title}
            className="buyer-deal-card__image"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className={`buyer-deal-card__placeholder buyer-deal-card__placeholder--${deal.heroVisual.tone}`}>
            <span aria-hidden="true">{deal.heroVisual.icon}</span>
            <small>{deal.heroVisual.label}</small>
          </div>
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
        <p className="buyer-deal-card__location">{displayCounty}</p>
        <h3>{displayAddress}</h3>
        {secondaryTitle ? <p className="buyer-deal-card__deal-name">{secondaryTitle}</p> : null}
        <p className="buyer-deal-card__specs">{getSpecs(deal)}</p>
        <p className="buyer-deal-card__summary">{deal.summary}</p>
        <dl className="buyer-deal-card__numbers buyer-deal-card__numbers--primary">
          <div>
            <dt>{mode === 'sold' ? 'Closed' : 'Asking'}</dt>
            <dd>{formatMoney(deal.financials.closedPrice ?? deal.financials.askingPrice)}</dd>
          </div>
          <div>
            <dt>ARV</dt>
            <dd>{formatMoney(deal.financials.arv)}</dd>
          </div>
          <div>
            <dt>Margin</dt>
            <dd>{formatMoney(potentialProfit)}</dd>
          </div>
        </dl>
        <div className="buyer-deal-card__actions">
          {inlineDetails ? (
            <>
              <button
                aria-controls={detailsId}
                aria-expanded={isExpanded}
                className="buyer-deal-card__details-toggle"
                onClick={() => setCardExpanded(!isExpanded)}
                type="button"
              >
                {isExpanded ? 'Hide underwriting' : 'View underwriting'}
              </button>
              {canSubmitOffer ? (
                <button
                  className="btn btn--primary buyer-deal-card__submit"
                  onClick={expandCard}
                  type="button"
                >
                  Submit Offer
                </button>
              ) : (
                <span className="buyer-deal-card__closed">Closed</span>
              )}
            </>
          ) : (
            <Link className="buyer-deal-card__link" href={`/deals/${deal.slug}/`}>
              {mode === 'sold' ? 'Review Sold Proof' : 'View Deal Details'}
            </Link>
          )}
        </div>
      </div>
      {inlineDetails ? (
        <div className="buyer-deal-card__details" hidden={!isExpanded} id={detailsId}>
          <div className="buyer-deal-card__details-grid">
            <section className="buyer-deal-card__detail-section">
              <h4>Condition</h4>
              <p>{deal.conditionSummary || deal.rehabScope || 'Condition notes are available during buyer diligence.'}</p>
            </section>
            <dl className="buyer-deal-card__detail-list">
              <div>
                <dt>Est. Rehab</dt>
                <dd>{formatMoney(deal.financials.estimatedRehab)}</dd>
              </div>
              <div>
                <dt>Total Basis</dt>
                <dd>{formatMoney(deal.calculatedFinancials.totalInvestment)}</dd>
              </div>
              <div>
                <dt>Potential ROI</dt>
                <dd>{formatPercent(potentialROI)}</dd>
              </div>
              <div>
                <dt>Occupancy</dt>
                <dd>{formatOccupancy(deal.propertyDetails.occupancy)}</dd>
              </div>
            </dl>
          </div>
          <div className="buyer-deal-card__comps">
            <CompList emptyLabel="Sale comps are available during diligence." items={deal.saleComps} title="Sale comps" />
            <CompList emptyLabel="Rental comps are available during diligence." items={deal.rentalComps} title="Rental comps" />
          </div>
          {deal.photos.length > 1 ? (
            <div className="buyer-deal-card__thumbs" aria-label="More property photos">
              {deal.photos.slice(1, 5).map((photo) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={photo.id} src={photo.thumbnailURL ?? photo.url} alt={photo.alt ?? deal.title} loading="lazy" />
              ))}
            </div>
          ) : null}
          {canSubmitOffer ? (
            <div ref={offerFormRef} className="buyer-deal-card__offer-form-anchor" tabIndex={-1}>
              <DealInterestForm deal={deal} idSuffix={deal.slug} />
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

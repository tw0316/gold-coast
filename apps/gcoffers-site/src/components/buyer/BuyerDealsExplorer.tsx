'use client'

import { useMemo, useState } from 'react'

import type { BuyerPublicDeal } from '@/lib/deals/dealView'

import { BuyerDealCard } from './BuyerDealCard'

const areas = ['Miami-Dade', 'Broward', 'Palm Beach'] as const
type AreaFilter = 'All' | (typeof areas)[number]

type BuyerDealsExplorerProps = {
  activeDeals: BuyerPublicDeal[]
}

const areaFromDeal = (deal: BuyerPublicDeal): (typeof areas)[number] | null => {
  const haystack = `${deal.county ?? ''} ${deal.locationLabel ?? ''}`.toLowerCase()

  if (haystack.includes('miami')) {
    return 'Miami-Dade'
  }
  if (haystack.includes('broward')) {
    return 'Broward'
  }
  if (haystack.includes('palm')) {
    return 'Palm Beach'
  }

  return null
}

export function BuyerDealsExplorer({ activeDeals }: BuyerDealsExplorerProps) {
  const [activeArea, setActiveArea] = useState<AreaFilter>('All')
  const filteredDeals = useMemo(
    () =>
      activeArea === 'All'
        ? activeDeals
        : activeDeals.filter((deal) => areaFromDeal(deal) === activeArea),
    [activeArea, activeDeals],
  )
  const activeCount = filteredDeals.length

  return (
    <section className="deals-shell" aria-label="Current deal map and list">
      <div className="map-panel">
        <div className="map-card" aria-label="Filter deals by South Florida market">
          {areas.map((area) => (
            <button
              aria-pressed={activeArea === area}
              className={`map-pin pin-${area === 'Miami-Dade' ? 'miami' : area === 'Broward' ? 'broward' : 'palm'}`}
              key={area}
              onClick={() => setActiveArea(area)}
              type="button"
            >
              {area}
            </button>
          ))}
          <div className="map-card__copy">
            <strong>South Florida coverage</strong>
            <p>
              Use the county buttons or map pins to filter active opportunities across Miami-Dade, Broward, and Palm Beach.
            </p>
          </div>
        </div>
      </div>
      <div className="deal-list">
        <div className="count-bar">
          <div>
            <strong>
              {activeCount} active deal{activeCount === 1 ? '' : 's'}
            </strong>
            <span className="deal-count-region">{activeArea === 'All' ? 'South Florida' : activeArea}</span>
          </div>
          <div className="pill-row" aria-label="Deal filters">
            {(['All', ...areas] as AreaFilter[]).map((area) => (
              <button
                aria-pressed={activeArea === area}
                className="pill"
                key={area}
                onClick={() => setActiveArea(area)}
                type="button"
              >
                {area}
              </button>
            ))}
          </div>
        </div>
        {activeCount > 0 ? (
          <div className="buyer-deals-grid buyer-deals-grid--public-index">
            {filteredDeals.map((deal) => (
              <BuyerDealCard deal={deal} key={deal.id} />
            ))}
          </div>
        ) : (
          <div className="empty-deals">
            <div className="empty-deals__icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <path d="M9 22V12h6v10" />
              </svg>
            </div>
            <h2>No active deals in {activeArea === 'All' ? 'South Florida' : activeArea} right now</h2>
            <p className="lede">
              We are under contract on new inventory. Join the buyer list and you will hear about the next one before it posts here.
            </p>
            <a className="btn" href="#join">Join the buyer list</a>
          </div>
        )}
      </div>
    </section>
  )
}

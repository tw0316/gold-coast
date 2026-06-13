'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { BuyerPublicDeal } from '@/lib/deals/dealView'
import { southFloridaCountyLabelFor } from '@/lib/deals/taxonomy'

import { BuyerDealCard } from './BuyerDealCard'
import { BuyerDealsMap } from './BuyerDealsMap'

type CountyFilter = string | null

type BuyerDealsExplorerProps = {
  activeDeals: BuyerPublicDeal[]
}

const preferredCountyOrder = ['Miami-Dade', 'Broward', 'Palm Beach']

const countyFromDeal = (deal: BuyerPublicDeal): string | null => {
  const county = deal.county?.trim()

  if (county) {
    return southFloridaCountyLabelFor(county) ?? county.replace(/ county$/i, '').trim()
  }

  return southFloridaCountyLabelFor(deal.locationLabel)
}

const sortCounties = (counties: string[]): string[] =>
  [...counties].sort((left, right) => {
    const leftIndex = preferredCountyOrder.indexOf(left)
    const rightIndex = preferredCountyOrder.indexOf(right)

    if (leftIndex !== -1 || rightIndex !== -1) {
      return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) -
        (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex)
    }

    return left.localeCompare(right)
  })

export function BuyerDealsExplorer({ activeDeals }: BuyerDealsExplorerProps) {
  const [activeCounty, setActiveCounty] = useState<CountyFilter>(null)
  const [hoveredDealId, setHoveredDealId] = useState<string | null>(null)
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const dealCardRefs = useRef(new Map<string, HTMLElement>())
  const dealCardRefCallbacks = useRef(new Map<string, (element: HTMLElement | null) => void>())

  const availableCountyFilters = useMemo(() => {
    const counties = new Set<string>()

    for (const deal of activeDeals) {
      const county = countyFromDeal(deal)
      if (county) {
        counties.add(county)
      }
    }

    return sortCounties([...counties])
  }, [activeDeals])

  useEffect(() => {
    if (activeCounty && !availableCountyFilters.includes(activeCounty)) {
      setActiveCounty(null)
    }
  }, [activeCounty, availableCountyFilters])

  const filteredDeals = useMemo(
    () => activeCounty ? activeDeals.filter((deal) => countyFromDeal(deal) === activeCounty) : activeDeals,
    [activeCounty, activeDeals],
  )

  useEffect(() => {
    if (selectedDealId && !filteredDeals.some((deal) => deal.id === selectedDealId)) {
      setSelectedDealId(null)
    }
    if (hoveredDealId && !filteredDeals.some((deal) => deal.id === hoveredDealId)) {
      setHoveredDealId(null)
    }
  }, [filteredDeals, hoveredDealId, selectedDealId])

  useEffect(() => {
    if (!selectedDealId || !filteredDeals.some((deal) => deal.id === selectedDealId)) {
      return
    }

    dealCardRefs.current.get(selectedDealId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    })
  }, [filteredDeals, selectedDealId])

  const registerDealCard = useCallback((dealId: string) => {
    const existingCallback = dealCardRefCallbacks.current.get(dealId)
    if (existingCallback) {
      return existingCallback
    }

    const callback = (element: HTMLElement | null) => {
      if (element) {
        dealCardRefs.current.set(dealId, element)
      } else {
        dealCardRefs.current.delete(dealId)
      }
    }
    dealCardRefCallbacks.current.set(dealId, callback)
    return callback
  }, [])

  useEffect(() => {
    const visibleDealIds = new Set(filteredDeals.map((deal) => deal.id))

    for (const dealId of dealCardRefs.current.keys()) {
      if (!visibleDealIds.has(dealId)) {
        dealCardRefs.current.delete(dealId)
      }
    }

    for (const dealId of dealCardRefCallbacks.current.keys()) {
      if (!visibleDealIds.has(dealId)) {
        dealCardRefCallbacks.current.delete(dealId)
      }
    }
  }, [filteredDeals])

  const activeDealId = hoveredDealId ?? selectedDealId
  const activeCount = filteredDeals.length
  const regionLabel = activeCounty ?? 'South Florida'

  return (
    <section className="deals-shell" aria-label="Current deal map and list">
      <div className="map-panel">
        {/* County filtering intentionally scopes both the list and the map; clicking the selected county restores full South Florida context. */}
        <BuyerDealsMap
          activeDealId={activeDealId}
          deals={filteredDeals}
          onDealHover={setHoveredDealId}
          onDealSelect={setSelectedDealId}
        />
      </div>
      <div className="deal-list">
        <div className="count-bar">
          <div>
            <strong>
              {activeCount} active deal{activeCount === 1 ? '' : 's'}
            </strong>
            <span className="deal-count-region">{regionLabel}</span>
          </div>
          {availableCountyFilters.length > 0 ? (
            <div className="pill-row" aria-label="Deal filters">
              {availableCountyFilters.map((county) => (
                <button
                  aria-pressed={activeCounty === county}
                  className="pill"
                  key={county}
                  onClick={() => setActiveCounty((current) => current === county ? null : county)}
                  type="button"
                >
                  {county}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {activeCount > 0 ? (
          <div className="buyer-deals-grid buyer-deals-grid--public-index">
            {filteredDeals.map((deal) => (
              <BuyerDealCard
                cardRef={registerDealCard(deal.id)}
                deal={deal}
                inlineDetails
                isActive={selectedDealId === deal.id}
                key={deal.id}
                onFocus={() => setHoveredDealId(deal.id)}
                onHover={() => setHoveredDealId(deal.id)}
                onLeave={() => setHoveredDealId(null)}
                onSelect={(selected) =>
                  setSelectedDealId((current) => selected ? deal.id : (current === deal.id ? null : current))
                }
              />
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
            <h2>No active deals in {regionLabel} right now</h2>
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

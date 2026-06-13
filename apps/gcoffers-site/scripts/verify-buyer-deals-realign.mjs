import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const read = (path) => readFileSync(join(root, path), 'utf8')

const failures = []
const assert = (condition, message) => {
  if (!condition) failures.push(message)
}

const explorer = read('src/components/buyer/BuyerDealsExplorer.tsx')
const card = read('src/components/buyer/BuyerDealCard.tsx')
const map = read('src/components/buyer/BuyerDealsMap.tsx')
const dealView = read('src/lib/deals/dealView.ts')
const publicQueries = read('src/lib/payload/publicQueries.ts')
const styles = read('src/app/(frontend)/styles.css')

assert(!explorer.includes("'All'") && !explorer.includes('>All<'), 'Deals explorer must not render or model an All filter pill.')
assert(explorer.includes('availableCountyFilters'), 'Deals explorer must derive county filters from the current active deals.')
assert(explorer.includes('setActiveCounty((current) =>'), 'Clicking the selected county must clear the county filter.')
assert(explorer.includes('setHoveredDealId'), 'Deals explorer must sync card hover state to the map.')
assert(explorer.includes('activeDealId = hoveredDealId ?? selectedDealId'), 'Deals explorer must let hover highlight the map without changing card selection.')
assert(explorer.includes('isActive={selectedDealId === deal.id}'), 'Deal cards must keep selected-card state independent from hover state.')
assert(explorer.includes('scrollIntoView'), 'Selecting a map pin must scroll the corresponding deal card into view.')
assert(explorer.includes('cardRef={registerDealCard(deal.id)}'), 'Deals explorer must register deal-card elements for map-pin selection scroll.')
assert(explorer.includes('<BuyerDealsMap'), 'Deals explorer must render the real map component.')

assert(map.includes('basemap.nationalmap.gov'), 'BuyerDealsMap must use public-domain USGS National Map tiles.')
assert(map.includes('buyer-map-pin'), 'BuyerDealsMap must render deal pins over the real map.')
assert(map.includes('aria-pressed={activeDealId === deal.id}'), 'BuyerDealsMap pins must expose active-deal state.')
assert(map.includes('onDealSelect(activeDealId === deal.id ? null : deal.id)'), 'BuyerDealsMap pins must toggle selection off when the active pin is clicked again.')
assert(map.includes('Tiles: U.S. Geological Survey, The National Map'), 'BuyerDealsMap must render USGS tile attribution copy.')

assert(card.includes('cardRef?: Ref<HTMLElement>'), 'BuyerDealCard must expose a cardRef for map-pin selection scroll.')
assert(card.includes('ref={cardRef}'), 'BuyerDealCard must attach the registered ref to the article.')
assert(card.includes("'use client'"), 'BuyerDealCard must be interactive so deal cards can expand inline.')
assert(!card.includes('Request Showing'), 'Deal cards must not include Request Showing CTA copy.')
assert(card.includes('Submit Offer'), 'Deal cards must expose a single Submit Offer CTA.')
assert(card.includes('DealInterestForm'), 'Submit Offer must reveal the existing deal-interest form contract inline.')
assert(card.includes('aria-expanded={isExpanded}'), 'Expandable cards must expose aria-expanded state.')
assert(card.includes('buyer-deal-card--is-active'), 'Map/card active styling must use a distinct selected class, not the active listing mode class.')
assert(styles.includes('buyer-deal-card--is-active'), 'CSS must style only the selected deal-card state, not every active listing card.')
assert(!styles.includes('.buyer-deal-card--active, .buyer-deal-card:hover'), 'CSS must not treat all active listings as selected cards.')
assert(explorer.includes('inlineDetails'), 'Public index cards must opt into inline details instead of primary detail-page routing.')

assert(dealView.includes('mapLocation'), 'Buyer deal view model must include map coordinates.')
assert(dealView.includes('saleComps'), 'Buyer deal view model must include optional sale comps for expanded cards.')
assert(dealView.includes('rentalComps'), 'Buyer deal view model must include optional rental comps for expanded cards.')
assert(dealView.includes('conditionSummary'), 'Buyer deal view model must include optional condition summary for expanded cards.')
assert(publicQueries.includes('saleComps: {\n    id: true'), 'Public deal select must include stable Payload IDs for sale comps.')
assert(publicQueries.includes('rentalComps: {\n    id: true'), 'Public deal select must include stable Payload IDs for rental comps.')

if (failures.length > 0) {
  console.error('Buyer deals realignment verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Buyer deals realignment verification passed.')

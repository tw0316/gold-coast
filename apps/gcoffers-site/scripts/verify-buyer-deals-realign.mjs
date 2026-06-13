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

assert(!explorer.includes("'All'") && !explorer.includes('>All<'), 'Deals explorer must not render or model an All filter pill.')
assert(explorer.includes('availableCountyFilters'), 'Deals explorer must derive county filters from the current active deals.')
assert(explorer.includes('setActiveCounty((current) =>'), 'Clicking the selected county must clear the county filter.')
assert(explorer.includes('setHoveredDealId'), 'Deals explorer must sync card hover state to the map.')
assert(explorer.includes('<BuyerDealsMap'), 'Deals explorer must render the real map component.')

assert(map.includes('basemaps.cartocdn.com'), 'BuyerDealsMap must use policy-compliant real map tiles.')
assert(map.includes('buyer-map-pin'), 'BuyerDealsMap must render deal pins over the real map.')
assert(map.includes('aria-pressed={activeDealId === deal.id}'), 'BuyerDealsMap pins must expose active-deal state.')

assert(card.includes("'use client'"), 'BuyerDealCard must be interactive so deal cards can expand inline.')
assert(!card.includes('Request Showing'), 'Deal cards must not include Request Showing CTA copy.')
assert(card.includes('Submit Offer'), 'Deal cards must expose a single Submit Offer CTA.')
assert(card.includes('DealInterestForm'), 'Submit Offer must reveal the existing deal-interest form contract inline.')
assert(card.includes('aria-expanded={isExpanded}'), 'Expandable cards must expose aria-expanded state.')
assert(!card.includes('href={`/deals/${deal.slug}/`}'), 'Public index cards must not route buyers to a detail page as the primary interaction.')

assert(dealView.includes('mapLocation'), 'Buyer deal view model must include map coordinates.')
assert(dealView.includes('saleComps'), 'Buyer deal view model must include optional sale comps for expanded cards.')
assert(dealView.includes('rentalComps'), 'Buyer deal view model must include optional rental comps for expanded cards.')
assert(dealView.includes('conditionSummary'), 'Buyer deal view model must include optional condition summary for expanded cards.')

if (failures.length > 0) {
  console.error('Buyer deals realignment verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Buyer deals realignment verification passed.')

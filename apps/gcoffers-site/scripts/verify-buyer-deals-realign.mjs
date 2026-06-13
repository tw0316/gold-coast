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
const taxonomy = read('src/lib/deals/taxonomy.ts')
const styles = read('src/app/(frontend)/styles.css')

assert(!explorer.includes("'All'") && !explorer.includes('>All<'), 'Deals explorer must not render or model an All filter pill.')
assert(explorer.includes('availableCountyFilters'), 'Deals explorer must derive county filters from the current active deals.')
assert(explorer.includes('setActiveCounty((current) =>'), 'Clicking the selected county must clear the county filter.')
assert(explorer.includes('setHoveredDealId'), 'Deals explorer must sync card hover state to the map.')
assert(explorer.includes('dealCardRefCallbacks'), 'Deals explorer must cache stable card ref callbacks by deal id.')
assert(explorer.includes('useCallback((dealId: string)'), 'Deals explorer must avoid ref churn on hover state updates.')
assert(explorer.includes('activeDealId = hoveredDealId ?? selectedDealId'), 'Deals explorer must let hover highlight the map without changing card selection.')
assert(explorer.includes('isActive={selectedDealId === deal.id}'), 'Deal cards must keep selected-card state independent from hover state.')
assert(explorer.includes('!selectedDealId || !filteredDeals.some((deal) => deal.id === selectedDealId)'), 'Deals explorer must avoid stale scroll attempts after county filter changes.')
assert(explorer.includes('hoveredDealId && !filteredDeals.some((deal) => deal.id === hoveredDealId)'), 'Deals explorer must clear stale hover state after county filter changes.')
assert(explorer.includes('scrollIntoView'), 'Selecting a map pin must scroll the corresponding deal card into view.')
assert(explorer.includes('cardRef={registerDealCard(deal.id)}'), 'Deals explorer must register deal-card elements for map-pin selection scroll.')
assert(explorer.includes('<BuyerDealsMap'), 'Deals explorer must render the real map component.')

assert(map.includes('const nextMappedDeals = deals'), 'BuyerDealsMap must keep deal-derived map geometry inside the memoized block.')
assert(map.includes('useMemo(() => {'), 'BuyerDealsMap must memoize tile and pin geometry.')
assert(map.includes('basemap.nationalmap.gov'), 'BuyerDealsMap must use public-domain USGS National Map tiles.')
assert(map.includes('buyer-map-pin'), 'BuyerDealsMap must render deal pins over the real map.')
assert(map.includes('aria-pressed={activeDealId === deal.id}'), 'BuyerDealsMap pins must expose active-deal state.')
assert(map.includes('onError={() => handleTileError(tile.key)}'), 'BuyerDealsMap must track failed map tile loads.')
assert(map.includes('allTilesFailed'), 'BuyerDealsMap must detect when all USGS tiles failed.')
assert(map.includes('Map tiles are temporarily unavailable. Deal pins are still shown.'), 'BuyerDealsMap must render a visible fallback when all tiles fail.')
assert(map.includes("loading: rowOffset === 0 && columnOffset === 0 ? 'eager' : 'lazy'"), 'BuyerDealsMap must eagerly load only the center tile and lazy-load surrounding tiles.')
assert(map.includes('loading={tile.loading}'), 'BuyerDealsMap must pass per-tile loading priority to tile images.')
assert(map.includes('useMemo(() => {') && map.includes('const currentTileKeys'), 'BuyerDealsMap must memoize failed-tile detection by current tile keys.')
assert(map.includes('currentTileKeys'), 'BuyerDealsMap must evaluate failed-tile state only against the current tile set.')
assert(map.includes('attemptedCurrentTileKeys.length === tiles.length'), 'BuyerDealsMap must show the failure banner only after every current tile has attempted and failed.')
assert(map.includes('setTileStatus({ attempted: new Set(), failed: new Set() })'), 'BuyerDealsMap must reset tile status when the tile set changes.')
assert(map.includes('onDealSelect(activeDealId === deal.id ? null : deal.id)'), 'BuyerDealsMap pins must toggle selection off when the active pin is clicked again.')
assert(map.includes('Tiles: U.S. Geological Survey, The National Map'), 'BuyerDealsMap must render USGS tile attribution copy.')

assert(explorer.includes('County filtering intentionally scopes both the list and the map'), 'Deals explorer must document that county filtering intentionally scopes the map too.')
assert(card.includes('setCardExpanded'), 'BuyerDealCard must share expand/collapse selection state through one helper.')
assert(card.includes('onClick={() => setCardExpanded(!isExpanded)}'), 'Underwriting toggle must use the shared card expansion helper.')
assert(card.includes('cardRef?: Ref<HTMLElement>'), 'BuyerDealCard must expose a cardRef for map-pin selection scroll.')
assert(card.includes('ref={cardRef}'), 'BuyerDealCard must attach the registered ref to the article.')
assert(taxonomy.includes('southFloridaCountyLabelFor'), 'South Florida county label matching must live in the shared deal taxonomy helper.')
assert(taxonomy.includes('southFloridaCountyKeyFor'), 'South Florida county key matching must live in the shared deal taxonomy helper.')
assert(explorer.includes('southFloridaCountyLabelFor'), 'Deals explorer must reuse the shared South Florida county helper.')
assert(dealView.includes('southFloridaCountyKeyFor'), 'Buyer deal view model must reuse the shared South Florida county helper.')
assert(card.includes('displayCounty'), 'BuyerDealCard must use the canonical county display label.')
assert(card.includes('aria-controls={detailsId}'), 'BuyerDealCard controls that reveal underwriting must point to the expandable details region.')
assert(card.includes('aria-expanded={isExpanded}'), 'BuyerDealCard controls that reveal underwriting must expose expanded state.')
assert(card.includes("'use client'"), 'BuyerDealCard must be interactive so deal cards can expand inline.')
assert(!card.includes('Request Showing'), 'Deal cards must not include Request Showing CTA copy.')
assert(card.includes('Submit Offer'), 'Deal cards must expose a single Submit Offer CTA.')
assert(card.includes('DealInterestForm'), 'Submit Offer must reveal the existing deal-interest form contract inline.')
assert(card.includes('aria-expanded={isExpanded}'), 'Expandable cards must expose aria-expanded state.')
assert(card.includes('buyer-deal-card--is-active'), 'Map/card active styling must use a distinct selected class, not the active listing mode class.')
assert(styles.includes('buyer-deal-card--is-active'), 'CSS must style only the selected deal-card state, not every active listing card.')
assert(!styles.includes('.buyer-deal-card--active, .buyer-deal-card:hover'), 'CSS must not treat all active listings as selected cards.')
assert(explorer.includes('inlineDetails'), 'Public index cards must opt into inline details instead of primary detail-page routing.')

assert(dealView.includes('mapLocation: BuyerMapLocation'), 'Buyer deal view model must type mapLocation as non-null because every active deal receives a fallback pin.')
assert(dealView.includes('isExactAddressPublic(deal) ? (deal.mapLocation ?? {})'), 'Buyer deal view model must defense-in-depth gate exact coordinates before mapping.')
assert(dealView.includes('defaultFallbackMapLocation'), 'Buyer deal view model must provide a catch-all map fallback so active deals do not disappear from the map.')
assert(dealView.includes('mapLocation'), 'Buyer deal view model must include map coordinates.')
assert(dealView.includes('saleComps'), 'Buyer deal view model must include optional sale comps for expanded cards.')
assert(dealView.includes('rentalComps'), 'Buyer deal view model must include optional rental comps for expanded cards.')
assert(dealView.includes('conditionSummary'), 'Buyer deal view model must include optional condition summary for expanded cards.')
assert(/saleComps:\s*{\s*id:\s*true/.test(publicQueries), 'Public deal select must include stable Payload IDs for sale comps.')
assert(/rentalComps:\s*{\s*id:\s*true/.test(publicQueries), 'Public deal select must include stable Payload IDs for rental comps.')

if (failures.length > 0) {
  console.error('Buyer deals realignment verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Buyer deals realignment verification passed.')

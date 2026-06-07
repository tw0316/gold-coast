import type { DealVisibilityInput } from './visibility'

export type DealVisibilityFixture = DealVisibilityInput & {
  id: string
  title: string
}

export const dealVisibilityFixtures: DealVisibilityFixture[] = [
  {
    id: 'public-coming-soon',
    title: 'Placeholder Coming Soon Deal',
    websiteVisibility: 'public',
    dealStatus: 'coming_soon',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    showExactAddressPublicly: false,
  },
  {
    id: 'public-available',
    title: 'Placeholder Available Deal',
    websiteVisibility: 'public',
    dealStatus: 'available',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    showExactAddressPublicly: false,
  },
  {
    id: 'public-under-contract',
    title: 'Placeholder Under Contract Deal',
    websiteVisibility: 'public',
    dealStatus: 'under_contract',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    showExactAddressPublicly: false,
  },
  {
    id: 'public-sold',
    title: 'Placeholder Sold Deal',
    websiteVisibility: 'public',
    dealStatus: 'sold',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    showExactAddressPublicly: false,
  },
  {
    id: 'hidden-internal-only',
    title: 'Placeholder Hidden Internal Deal',
    websiteVisibility: 'hidden',
    dealStatus: 'available',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    showExactAddressPublicly: false,
  },
  {
    id: 'preview-deal',
    title: 'Placeholder Preview Deal',
    websiteVisibility: 'preview',
    dealStatus: 'available',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    showExactAddressPublicly: false,
  },
  {
    id: 'archived-deal',
    title: 'Placeholder Archived Deal',
    websiteVisibility: 'archived',
    dealStatus: 'available',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    showExactAddressPublicly: false,
  },
  {
    id: 'draft-deal',
    title: 'Placeholder Draft Deal',
    websiteVisibility: 'public',
    dealStatus: 'draft',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    showExactAddressPublicly: false,
  },
  {
    id: 'cancelled-deal',
    title: 'Placeholder Cancelled Deal',
    websiteVisibility: 'public',
    dealStatus: 'cancelled',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    showExactAddressPublicly: false,
  },
]

// Single source of truth for deal taxonomies shared by the Payload collection
// (admin select options), the public view-model (display labels), and the
// database migration (enum values). Keep enum values in sync with the matching
// Postgres enums in src/migrations.

export type TaxonomyOption = {
  label: string
  value: string
}

// What the property physically is. Drives conditional property-detail fields.
export const PROPERTY_TYPE_OPTIONS: readonly TaxonomyOption[] = [
  { label: 'Single-family', value: 'single_family' },
  { label: 'Condo', value: 'condo' },
  { label: 'Townhouse', value: 'townhouse' },
  { label: 'Duplex', value: 'duplex' },
  { label: 'Multifamily', value: 'multifamily' },
  { label: 'Land', value: 'land' },
]

// What an end buyer would do with the property (investment strategy). Buyer-facing,
// multi-select. Replaces the retired internal "dealType" (wholesale/assignment) concept.
export const BEST_USE_OPTIONS: readonly TaxonomyOption[] = [
  { label: 'Fix & Flip', value: 'fix_and_flip' },
  { label: 'Buy & Hold (Rental)', value: 'buy_and_hold' },
  { label: 'BRRRR', value: 'brrrr' },
  { label: 'Turnkey / Immediate Equity', value: 'turnkey_immediate_equity' },
  { label: 'Land Bank', value: 'land_bank' },
  { label: 'Development / Redevelopment', value: 'development' },
]

// Quick highlight chips for filtering and scannability.
export const FEATURE_TAG_OPTIONS: readonly TaxonomyOption[] = [
  { label: 'Cash only', value: 'cash_only' },
  { label: 'Tenant occupied', value: 'tenant_occupied' },
  { label: 'Cosmetic reno', value: 'cosmetic_reno' },
  { label: 'Full gut rehab', value: 'full_gut' },
  { label: 'Owner financing', value: 'owner_financing' },
  { label: 'Pool', value: 'pool' },
  { label: 'Waterfront', value: 'waterfront' },
  { label: 'Corner lot', value: 'corner_lot' },
  { label: 'Newer roof', value: 'new_roof' },
]

// Property types that hide land-irrelevant residential fields (beds/baths/etc.).
export const LAND_PROPERTY_TYPE = 'land'
// Property types with no owned land (lot size is not meaningful).
export const NO_LOT_SIZE_PROPERTY_TYPES = ['condo', 'townhouse']
// Property types that can carry more than one unit.
export const MULTI_UNIT_PROPERTY_TYPES = ['duplex', 'multifamily']

const toLabelMap = (options: readonly TaxonomyOption[]): Record<string, string> =>
  Object.fromEntries(options.map((option) => [option.value, option.label]))

export const PROPERTY_TYPE_LABELS = toLabelMap(PROPERTY_TYPE_OPTIONS)
export const BEST_USE_LABELS = toLabelMap(BEST_USE_OPTIONS)
export const FEATURE_TAG_LABELS = toLabelMap(FEATURE_TAG_OPTIONS)

export const labelsFor = (
  values: unknown,
  labelMap: Record<string, string>,
): string[] => {
  if (!Array.isArray(values)) {
    return []
  }

  return values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => labelMap[value] ?? value)
}

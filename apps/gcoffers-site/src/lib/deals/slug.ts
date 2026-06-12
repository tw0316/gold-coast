const FALLBACK_DEAL_SLUG = 'deal'

export const toDealSlug = (value: unknown): string => {
  if (typeof value !== 'string') {
    return FALLBACK_DEAL_SLUG
  }

  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || FALLBACK_DEAL_SLUG
}

export const normalizeDealSlugInput = (slug: string): string => {
  try {
    return toDealSlug(decodeURIComponent(slug))
  } catch {
    return toDealSlug(slug)
  }
}

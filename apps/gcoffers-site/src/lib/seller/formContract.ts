export const SELLER_LEAD_POST_TARGET = '/api/seller-leads'
export const SELLER_LEAD_SOURCE = 'seller-site'

export const SELLER_LEAD_REQUIRED_FIELDS = ['fullName', 'address', 'phone', 'email'] as const

export const SELLER_LEAD_CONSENT_FIELDS = ['serviceConsent', 'marketingConsent'] as const

export const SELLER_LEAD_CONTEXT_FIELDS = ['source', 'page', 'referrer', 'userAgent'] as const

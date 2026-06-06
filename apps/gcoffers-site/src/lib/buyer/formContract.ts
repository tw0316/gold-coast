export const BUYER_SIGNUP_POST_TARGET = '/api/buyer-signups'
export const BUYER_SIGNUP_SOURCE = 'deals-website'
export const BUYER_SIGNUP_FORM_CONTRACT = 'slice-6-s3-first-buyer-signup'
export const BUYER_SIGNUP_CRM_TAGS = ['buyer-list', 'deals-website'] as const
export const BUYER_FORM_HONEYPOT_FIELD = 'website'

export const DEAL_INTEREST_POST_TARGET = '/api/deal-interest'
export const DEAL_INTEREST_SOURCE = 'deals-website'
export const DEAL_INTEREST_FORM_CONTRACT = 'slice-6-s3-first-deal-interest'
export const DEAL_INTEREST_PHONE_CONSENT_CONTRACT = 'phone-requires-service-consent'

export type BuyerSignupFormField = {
  name: string
  required: boolean
}

export type DealInterestFormField = {
  name: string
  required: boolean
}

export const buyerSignupFormContract: BuyerSignupFormField[] = [
  { name: 'email', required: true },
  { name: 'fullName', required: false },
  { name: 'phone', required: false },
  { name: 'buyerType', required: false },
  { name: 'areas', required: false },
  { name: 'propertyTypes', required: false },
  { name: 'priceRange', required: false },
  { name: 'purchaseMethod', required: false },
  { name: 'serviceConsent', required: false },
  { name: 'marketingConsent', required: false },
  { name: 'source', required: false },
  { name: 'contract', required: true },
]

export const dealInterestFormContract: DealInterestFormField[] = [
  { name: 'dealSlug', required: true },
  { name: 'email', required: true },
  { name: 'fullName', required: false },
  { name: 'phone', required: false },
  { name: 'serviceConsent', required: false },
  { name: 'message', required: false },
  { name: 'source', required: false },
  { name: 'contract', required: true },
  { name: 'phoneConsentContract', required: true },
]

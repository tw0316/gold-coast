import { dealVisibilityFixtures } from '../lib/deals/fixtures'

export const schemaAccessFixtures = {
  deals: dealVisibilityFixtures,
  media: [
    {
      id: 'private-default-media',
      accessPolicy: undefined,
      mediaStatus: 'ready',
    },
    {
      id: 'draft-public-reference-media',
      accessPolicy: 'public_after_reference_check',
      mediaStatus: 'draft',
    },
    {
      id: 'ready-public-reference-media',
      accessPolicy: 'public_after_reference_check',
      mediaStatus: 'ready',
    },
    {
      id: 'hidden-public-reference-media',
      accessPolicy: 'public_after_reference_check',
      mediaStatus: 'hidden',
    },
    {
      id: 'private-details-media',
      accessPolicy: 'public_after_reference_check',
      mediaStatus: 'ready',
      containsExactAddressOrPrivateDetails: true,
    },
  ],
  markets: [
    {
      id: 'placeholder-enabled-market',
      enabled: true,
      name: 'Placeholder Enabled Market',
      slug: 'placeholder-enabled-market',
    },
    {
      id: 'placeholder-disabled-market',
      enabled: false,
      name: 'Placeholder Disabled Market',
      slug: 'placeholder-disabled-market',
    },
  ],
  pages: [
    {
      id: 'placeholder-published-page',
      slug: 'placeholder-published-page',
      status: 'published',
      surface: 'buyer',
      title: 'Placeholder Published Page',
    },
    {
      id: 'placeholder-draft-page',
      slug: 'placeholder-draft-page',
      status: 'draft',
      surface: 'buyer',
      title: 'Placeholder Draft Page',
    },
  ],
  faqs: [
    {
      id: 'placeholder-published-faq',
      answer: 'Placeholder answer for schema/access verification only.',
      question: 'Placeholder published FAQ?',
      status: 'published',
      surface: 'buyer',
    },
    {
      id: 'placeholder-draft-faq',
      answer: 'Placeholder draft answer for schema/access verification only.',
      question: 'Placeholder draft FAQ?',
      status: 'draft',
      surface: 'buyer',
    },
  ],
  siteSettings: [
    {
      id: 'placeholder-public-site-settings',
      isPublic: true,
      label: 'Placeholder public site settings',
      surface: 'shared',
    },
    {
      id: 'placeholder-private-site-settings',
      isPublic: false,
      label: 'Placeholder private site settings',
      surface: 'shared',
    },
  ],
  submissions: {
    buyerSignup: {
      id: 'placeholder-buyer-signup',
      email: '[REDACTED_EMAIL]',
      emailHash: 'placeholder-email-hash',
      fullName: '[REDACTED_NAME]',
      phone: '[REDACTED_PHONE]',
      s3ObjectKey: 'placeholder/buyer-signups/placeholder-record.json',
    },
    dealInterest: {
      id: 'placeholder-deal-interest',
      dealSlug: 'placeholder-available-deal',
      email: '[REDACTED_EMAIL]',
      emailHash: 'placeholder-email-hash',
      fullName: '[REDACTED_NAME]',
      phone: '[REDACTED_PHONE]',
      s3ObjectKey: 'placeholder/deal-interest/placeholder-record.json',
    },
  },
  submissionCollections: ['buyer-signups', 'deal-interest'],
} as const

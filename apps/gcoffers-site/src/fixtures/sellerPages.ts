export type SellerPageSurface = 'seller' | 'shared'
export type SellerPageStatus = 'published'
export type SellerPageSectionType = 'hero' | 'rich_text' | 'cta' | 'two_column' | 'legal'

export type SellerPayloadPageSectionSeed = {
  sectionType: SellerPageSectionType
  eyebrow?: string
  heading?: string
  body?: string
  ctaLabel?: string
  ctaHref?: string
  sortOrder: number
}

export type SellerPayloadPageSeed = {
  title: string
  slug: string
  surface: SellerPageSurface
  status: SellerPageStatus
  summary: string
  sections: SellerPayloadPageSectionSeed[]
  navigation: {
    showInNav: boolean
    navLabel?: string
    sortOrder: number
  }
  seo: {
    title: string
    description: string
    canonicalPath: string
    noIndex: boolean
  }
  publishedAt: string
}

const publishedAt = '2026-06-05T00:00:00.000Z'

export const sellerHomePageSeed: SellerPayloadPageSeed = {
  title: 'Sell Your House Fast in South Florida',
  slug: 'home',
  surface: 'seller',
  status: 'published',
  summary:
    'Seller landing page migrated from the legacy static website with hero, lead form, benefits, comparison, reasons, testimonials, service area, CTA, and footer content.',
  sections: [
    {
      sectionType: 'hero',
      eyebrow: 'Gold Coast Home Buyers',
      heading: 'Sell your South Florida house fast.',
      body: 'Get a fair cash offer in 24 hours. No repairs, no commissions, and no pressure.',
      ctaLabel: 'Get My Cash Offer',
      ctaHref: '/#seller-lead-form',
      sortOrder: 10,
    },
    {
      sectionType: 'rich_text',
      eyebrow: 'How It Works',
      heading: 'Three simple steps to sell your home',
      body: 'Tell us about the property, receive a no-obligation cash offer, and close on the timeline that works for you.',
      sortOrder: 20,
    },
    {
      sectionType: 'two_column',
      eyebrow: 'Why Us',
      heading: 'Listing the traditional way vs. selling direct',
      body: 'The seller baseline preserves the legacy comparison between agent-listing friction and a direct Gold Coast cash offer.',
      sortOrder: 30,
    },
    {
      sectionType: 'cta',
      eyebrow: 'South Florida',
      heading: 'Get your no-obligation cash offer today',
      body: 'Tell us about your property now and the team will follow up within 24 hours.',
      ctaLabel: 'Start My Offer',
      ctaHref: '/#seller-lead-form',
      sortOrder: 40,
    },
  ],
  navigation: {
    showInNav: true,
    navLabel: 'Sell Your House',
    sortOrder: 10,
  },
  seo: {
    title: 'Sell Your House Fast in South Florida | Gold Coast Home Buyers',
    description:
      'Get a fair cash offer for your South Florida home in 24 hours. No repairs, no fees, no hassle. Close fast.',
    canonicalPath: '/',
    noIndex: false,
  },
  publishedAt,
}

export const sellerPrivacyPolicyPageSeed: SellerPayloadPageSeed = {
  title: 'Privacy Policy',
  slug: 'privacy-policy',
  surface: 'shared',
  status: 'published',
  summary:
    'Shared seller/buyer legal privacy policy seed migrated from the legacy Gold Coast Home Buyers website.',
  sections: [
    {
      sectionType: 'legal',
      heading: 'Information We Collect',
      body: 'Contact information, property information, technical data, and consent records submitted through the Site.',
      sortOrder: 10,
    },
    {
      sectionType: 'legal',
      heading: 'How We Use Your Information',
      body: 'Evaluate properties, prepare offers, contact sellers about inquiries, improve services, and comply with legal obligations.',
      sortOrder: 20,
    },
    {
      sectionType: 'legal',
      heading: 'SMS/Text Messaging Opt-In',
      body: 'Service messages and separately opted-in marketing messages are handled under the published SMS disclosure terms.',
      sortOrder: 30,
    },
  ],
  navigation: {
    showInNav: false,
    navLabel: 'Privacy Policy',
    sortOrder: 90,
  },
  seo: {
    title: 'Privacy Policy | Gold Coast Home Buyers',
    description: 'Privacy Policy for Gold Coast Home Buyers.',
    canonicalPath: '/privacy-policy/',
    noIndex: false,
  },
  publishedAt,
}

export const sellerTermsPageSeed: SellerPayloadPageSeed = {
  title: 'Terms of Service',
  slug: 'terms',
  surface: 'shared',
  status: 'published',
  summary:
    'Shared seller/buyer terms seed migrated from the legacy Gold Coast Home Buyers website.',
  sections: [
    {
      sectionType: 'legal',
      heading: 'Use of the Site',
      body: 'The Site is intended for individuals seeking to sell residential real estate in South Florida.',
      sortOrder: 10,
    },
    {
      sectionType: 'legal',
      heading: 'Communications Consent',
      body: 'Consent to service-related communications and separate optional marketing messages remains explicit and revocable.',
      sortOrder: 20,
    },
    {
      sectionType: 'legal',
      heading: 'No Obligation',
      body: 'Submitting information through the Site does not create a binding agreement to sell a property.',
      sortOrder: 30,
    },
  ],
  navigation: {
    showInNav: false,
    navLabel: 'Terms of Service',
    sortOrder: 100,
  },
  seo: {
    title: 'Terms of Service | Gold Coast Home Buyers',
    description: 'Terms of Service for Gold Coast Home Buyers.',
    canonicalPath: '/terms/',
    noIndex: false,
  },
  publishedAt,
}

export const sellerPageSeeds = [
  sellerHomePageSeed,
  sellerPrivacyPolicyPageSeed,
  sellerTermsPageSeed,
]

export const sellerHomeContent = {
  hero: {
    eyebrow: 'Gold Coast Home Buyers',
    heading: 'Sell your South Florida house fast.',
    subheading: 'Get a fair cash offer in 24 hours.',
    trustPills: ['No Repairs', 'No Commissions', 'Close on Your Timeline'],
    microTrust: "No obligation. No spam. We'll contact you within 24 hours.",
    proof: 'Verified South Florida seller: “Fast, fair, and stress-free.”',
    image: {
      src: '/assets/hero-home.png',
      alt: 'South Florida home exterior',
    },
  },
  nextSteps: [
    'We review your property details',
    'You get a no-obligation cash offer',
    'You choose if and when to close',
  ],
  howItWorks: [
    {
      title: 'Tell Us About the Property',
      text: 'Share the address and a few basics. The form takes about two minutes.',
    },
    {
      title: 'Get a Fair Cash Offer',
      text: 'We review local comps and prepare a no-obligation offer within 24 hours.',
    },
    {
      title: 'Close on Your Timeline',
      text: 'Pick your date. We coordinate title, paperwork, and standard closing costs.',
    },
  ],
  benefits: [
    {
      title: 'Fair Cash Offers',
      text: 'Data-backed offers aligned with local South Florida market value.',
      icon: '$',
    },
    {
      title: 'Closing Fast',
      text: 'A cash buyer means no lender delays and fewer moving parts.',
      icon: '↗',
    },
    {
      title: 'Sell As-Is',
      text: 'Skip repairs, cleanouts, staging, and repeated showings.',
      icon: '✓',
    },
    {
      title: 'No Fees or Commissions',
      text: 'No agent commission, no surprise platform fee, and no pressure.',
      icon: '0',
    },
    {
      title: 'We Handle Everything',
      text: 'Title, paperwork, and closing coordination are handled for you.',
      icon: '⌂',
    },
    {
      title: 'No Obligation',
      text: 'Review your offer and decide with confidence on your own timeline.',
      icon: '★',
    },
  ],
  comparison: {
    traditional: {
      title: 'Traditional Agent',
      items: [
        'Pay 5-6% in commissions',
        'Repairs and staging often required',
        'Showings and open houses',
        '60-90+ days average timeline',
        'Buyer financing may fall through',
        'Uncertain final price',
      ],
    },
    direct: {
      title: 'Gold Coast Home Buyers',
      items: [
        'Zero fees or commissions',
        'Sell as-is, no repairs',
        'No showings, no strangers',
        'Close fast, on your timeline',
        'Cash offer, no financing risk',
        'Guaranteed price, no surprises',
      ],
    },
  },
  reasons: [
    'Inherited Property',
    'Foreclosure',
    'Divorce',
    'Expensive Repairs',
    'Relocating',
    'Bad Tenants',
    'Downsizing',
    'Job Loss',
    'Health Issues',
    'Liens or Code Violations',
    'Fire or Storm Damage',
    'Retirement',
  ],
  testimonials: [
    {
      quote:
        'They made the whole process easy from first call to closing. The offer was fair and the timeline was exactly what we needed.',
      author: 'Verified seller in Miami',
    },
    {
      quote:
        'I inherited a property I could not maintain. Gold Coast handled the paperwork and helped me close quickly without repairs.',
      author: 'Verified seller in Fort Lauderdale',
    },
    {
      quote:
        'After months trying the traditional route, the direct offer gave us a clear path forward with much less stress.',
      author: 'Verified seller in Boca Raton',
    },
  ],
  serviceArea: ['Miami', 'Fort Lauderdale', 'Boca Raton', 'West Palm Beach', 'South Florida'],
  cta: {
    heading: 'Get your no-obligation cash offer today',
    text: "Tell us about your property now. We'll respond within 24 hours.",
    label: 'Start My Cash Offer',
    href: '/#seller-lead-form',
  },
} as const

export type SellerLegalSection = {
  heading: string
  paragraphs?: string[]
  items?: string[]
}

export type SellerLegalPageContent = {
  seed: SellerPayloadPageSeed
  title: string
  lastUpdated: string
  intro: string[]
  sections: SellerLegalSection[]
}

export const sellerLegalPages = {
  privacyPolicy: {
    seed: sellerPrivacyPolicyPageSeed,
    title: 'Privacy Policy',
    lastUpdated: 'March 6, 2026',
    intro: [
      'W & Co LLC, doing business as Gold Coast Home Buyers, operates the website gcoffers.com. This Privacy Policy describes how we collect, use, disclose, and protect information submitted through the Site, online forms, phone, email, or text communications.',
      'By accessing or using the Site or submitting information through our forms, you acknowledge that you have read and understand this Privacy Policy.',
    ],
    sections: [
      {
        heading: 'Information We Collect',
        paragraphs: ['We may collect the following information when you interact with the Site:'],
        items: [
          'Contact information such as full name, email address, and phone number',
          'Property information such as property address, property condition, and desired sale timeline',
          'Technical data such as IP address, browser type, device information, pages visited, and referring URL',
          'Consent records such as service-message consent, marketing-message consent, and submission timestamp',
        ],
      },
      {
        heading: 'How We Use Your Information',
        paragraphs: ['We use the information we collect to:'],
        items: [
          'Evaluate your property and prepare a cash offer',
          'Contact you regarding your property inquiry',
          'Send marketing communications only when you separately opt in',
          'Improve our website and services',
          'Comply with legal obligations',
        ],
      },
      {
        heading: 'Telephone Consumer Protection Act Disclosure',
        paragraphs: [
          'When you provide a phone number and check a consent box, you expressly consent to receive the applicable service-related or marketing communications from Gold Coast Home Buyers at the phone number provided. Consent is not a condition of purchase. Message and data rates may apply. You may opt out at any time by replying STOP or contacting us directly.',
        ],
      },
      {
        heading: 'SMS/Text Messaging Opt-In',
        paragraphs: [
          'Service messages may include appointment confirmations, property evaluation updates, document requests, and transaction follow-ups.',
          'Marketing messages may include property opportunities, special offers, and company updates only when you opt in separately.',
          'We do not sell, rent, or share your phone number or SMS opt-in information with third parties for their marketing purposes.',
        ],
      },
      {
        heading: 'How We Share Your Information',
        paragraphs: ['We do not sell your personal information. We may share information with:'],
        items: [
          'Service providers that help us manage leads and communications',
          'Trusted real estate professionals who may assist in evaluating or purchasing a property',
          'Legal authorities when required by law, regulation, or legal process',
        ],
      },
      {
        heading: 'Data Storage and Security',
        paragraphs: [
          'We use industry-standard security measures to protect information, including encrypted storage and secure transmission protocols. Information is stored on secure cloud services located in the United States.',
        ],
      },
      {
        heading: 'Your Rights',
        paragraphs: ['Depending on your jurisdiction, you may have the right to:'],
        items: [
          'Access the personal data we hold about you',
          'Request correction of inaccurate data',
          'Request deletion of your personal data',
          'Opt out of marketing communications',
          'Withdraw consent for calls and text messages',
        ],
      },
      {
        heading: 'Cookies & Tracking Technologies',
        paragraphs: [
          'The Site may use cookies and similar technologies to understand website usage, maintain the browsing experience, and measure campaign performance. You can control cookie settings through your browser preferences.',
        ],
      },
      {
        heading: 'Data Deletion Requests',
        paragraphs: [
          'You may request deletion of personal data we have collected by contacting the privacy inbox listed on the Site. We will verify the request and process deletion in accordance with applicable law and legitimate business record requirements.',
        ],
      },
      {
        heading: 'Contact Us',
        paragraphs: [
          'If you have questions about this Privacy Policy or want to exercise your rights, contact Gold Coast Home Buyers through the published contact channels on gcoffers.com.',
        ],
      },
    ],
  },
  terms: {
    seed: sellerTermsPageSeed,
    title: 'Terms of Service',
    lastUpdated: 'March 6, 2026',
    intro: [
      'Welcome to gcoffers.com, owned and operated by W & Co LLC, doing business as Gold Coast Home Buyers. By accessing or using this Site, you agree to be bound by these Terms of Service.',
    ],
    sections: [
      {
        heading: '1. Use of the Site',
        paragraphs: [
          'This Site is intended for individuals seeking to sell residential real estate in South Florida. You agree to use the Site only for lawful purposes and in accordance with these Terms. You must be at least 18 years old to use this Site.',
        ],
      },
      {
        heading: '2. Information You Provide',
        paragraphs: ['When you submit information through our forms, you represent that:'],
        items: [
          'The information you provide is accurate and complete',
          'You are the owner of the property or are authorized to act on behalf of the owner',
          'You consent to be contacted by Gold Coast Home Buyers regarding your property inquiry according to the consent choices you submit',
        ],
      },
      {
        heading: '3. No Obligation',
        paragraphs: [
          'Submitting information through the Site does not create a binding agreement to sell your property. Any cash offer is non-binding until a formal purchase agreement is executed by both parties.',
        ],
      },
      {
        heading: '4. Communications Consent',
        paragraphs: [
          'By checking the applicable consent boxes on the form, you agree to receive service-related communications and, if separately selected, marketing communications from Gold Coast Home Buyers. Consent to receive marketing messages is separate and optional. You may revoke consent at any time by replying STOP to a text message or contacting us directly.',
        ],
      },
      {
        heading: '5. SMS/Text Message Terms',
        paragraphs: [
          'Service texts may relate to property evaluations, appointment scheduling, transaction updates, document requests, and follow-ups. Marketing texts may be sent only when separately opted in.',
          'Message frequency varies based on engagement with our services. Message and data rates may apply. Mobile carriers are not liable for delayed or undelivered messages.',
        ],
      },
      {
        heading: '6. Intellectual Property',
        paragraphs: [
          'All content on the Site, including text, graphics, logos, and design, is the property of Gold Coast Home Buyers and is protected by applicable intellectual property laws.',
        ],
      },
      {
        heading: '7. Disclaimers',
        paragraphs: [
          'The Site and its content are provided as-is without warranties of any kind. We do not guarantee uninterrupted service, a specific offer amount, or completion of any transaction.',
        ],
      },
      {
        heading: '8. Limitation of Liability',
        paragraphs: [
          'To the fullest extent permitted by law, Gold Coast Home Buyers shall not be liable for indirect, incidental, special, consequential, or punitive damages arising out of or related to use of the Site.',
        ],
      },
      {
        heading: '9. Governing Law',
        paragraphs: [
          'These Terms are governed by the laws of the State of Florida, without regard to conflict of law provisions. Disputes shall be resolved in the appropriate courts in Florida.',
        ],
      },
      {
        heading: '10. Data Deletion Requests',
        paragraphs: [
          'You may request deletion of personal data we have collected by contacting Gold Coast Home Buyers through the published contact channels on gcoffers.com. We will verify and process requests in accordance with applicable law.',
        ],
      },
      {
        heading: '11. Contact Us',
        paragraphs: [
          'If you have questions about these Terms, contact Gold Coast Home Buyers through the published contact channels on gcoffers.com.',
        ],
      },
    ],
  },
} satisfies Record<string, SellerLegalPageContent>

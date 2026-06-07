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
  title: 'Gold Coast Home Buyers | Sell Your South Florida House Fast',
  slug: 'home',
  surface: 'seller',
  status: 'published',
  summary:
    'Seller landing page ported from the current staging redesign with Hero A, proof cards, reviews, comparison, FAQ, offer form, and footer handoff content.',
  sections: [
    {
      sectionType: 'hero',
      eyebrow: '4.9 from 400+ South Florida homeowners',
      heading: 'Sell your home the easy way.',
      body: 'We’re your neighbors in South Florida. Tell us about your home and we’ll send a fair cash offer — no repairs, no fees, and you pick the day you move.',
      ctaLabel: 'Get my cash offer',
      ctaHref: '/#offer',
      sortOrder: 10,
    },
    {
      sectionType: 'rich_text',
      eyebrow: 'How it works',
      heading: 'Three simple steps to a fair offer.',
      body: 'From the first address to cash at closing, we keep it calm, clear, and on your schedule.',
      sortOrder: 20,
    },
    {
      sectionType: 'rich_text',
      eyebrow: 'Why sellers choose us',
      heading: 'A simpler way to sell, start to finish.',
      body: 'No repairs, no fees, no waiting on a buyer’s lender — just a fair, underwritten offer and a close that works on your terms.',
      sortOrder: 30,
    },
    {
      sectionType: 'two_column',
      eyebrow: 'Us vs. listing',
      heading: 'Selling to us vs. listing with an agent.',
      body: 'Same home, two very different paths. Here’s how they stack up, line by line.',
      sortOrder: 40,
    },
    {
      sectionType: 'cta',
      eyebrow: 'Get your offer',
      heading: 'See your no-obligation cash offer.',
      body: 'Tell us about your property and we’ll respond within 24 hours with a fair, underwritten number.',
      ctaLabel: 'Get my cash offer',
      ctaHref: '/#offer',
      sortOrder: 50,
    },
  ],
  navigation: {
    showInNav: true,
    navLabel: 'Sell',
    sortOrder: 10,
  },
  seo: {
    title: 'Gold Coast Home Buyers | Sell Your South Florida House Fast',
    description:
      'Get a fast cash offer for your South Florida house. Gold Coast Home Buyers buys homes across Miami-Dade, Broward, and Palm Beach.',
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
    rating: '4.9 from 400+ South Florida homeowners',
    heading: 'Sell your home the easy way.',
    lede:
      'We’re your neighbors in South Florida. Tell us about your home and we’ll send a fair cash offer — no repairs, no fees, and you pick the day you move.',
    assurances: ['No obligation', 'Takes 2 minutes', 'Your info stays private'],
    trustRow: ['No repairs', 'No fees or commissions', 'Close in as few as 14 days'],
    situationsIntro: 'We work with sellers facing',
    situations: [
      'Foreclosure',
      'Inherited or probate',
      'Divorce',
      'Problem tenants',
      'Liens',
      'Relocation',
      'Major repairs',
      'Vacant property',
    ],
    image: {
      src: '/assets/hero-home.png',
      alt: 'South Florida home exterior at golden hour',
    },
    offerFloat: {
      label: 'Your cash offer',
      property: '3/2 in Pembroke Pines',
      amount: '$418,000',
      note: 'Sent in under 24 hours',
    },
  },
  howItWorks: {
    eyebrow: 'How it works',
    heading: 'Three simple steps to a fair offer.',
    lede: 'From the first address to cash at closing, we keep it calm, clear, and on your schedule.',
    steps: [
      {
        icon: '⌂',
        num: '01',
        title: 'Tell us about the home',
        text: 'Share the address and a few details. Takes about two minutes — no account, no obligation.',
      },
      {
        icon: '✓',
        num: '02',
        title: 'Get a verified cash offer',
        text: 'We pull local comps and underwrite the property in house, then send a fair, no-obligation offer.',
      },
      {
        icon: '⚿',
        num: '03',
        title: 'Close on your timeline',
        text: 'Pick the date that works for you. We cover standard closing costs and handle the paperwork.',
      },
    ],
  },
  proof: {
    eyebrow: 'Why sellers choose us',
    heading: 'A simpler way to sell, start to finish.',
    lede:
      'No repairs, no fees, no waiting on a buyer’s lender — just a fair, underwritten offer and a close that works on your terms.',
    cards: [
      {
        icon: '🔧',
        title: 'No repairs or cleanout',
        text: 'Sell exactly as it sits. Skip the contractors, the staging, and the dumpster — we underwrite around the condition.',
      },
      {
        icon: '▤',
        title: 'No commissions or fees',
        text: 'No agent commission, no listing fees, no surprise line items. The number we send is the number you keep.',
      },
      {
        icon: '◷',
        title: 'Cash offer in 24 hours',
        text: 'Send the address and a few details. Our acquisitions team pulls comps and responds within a single day.',
      },
      {
        icon: '□',
        title: 'You pick the closing date',
        text: 'Close in as few as 14 days or take 90 — choose the date that fits your move and we work around it.',
      },
    ],
    movePanel: {
      eyebrow: 'Included free at close',
      title: 'The Move On Package',
      text: 'When you close with us, we coordinate and pay for a professional cleanout. Take what matters to you and leave the rest — nothing to haul, sort, or scrub. You walk away with a check and a clean break.',
    },
  },
  reviews: {
    eyebrow: 'Why sellers choose us',
    heading: '412 South Florida families have moved on with us.',
    lede:
      'Real neighbors, real closings. Here’s what it was like to sell their home to a local team that picked up the phone.',
    score: '4.9 / 5 average from verified sellers',
    cards: [
      {
        initials: 'MG',
        quote:
          'They didn’t treat it like a transaction. We had just lost my father, and Gold Coast handled everything so our family could focus on each other. We closed in eleven days.',
        name: 'Maria G.',
        detail: 'Miami · Sold her family’s home',
      },
      {
        initials: 'JR',
        quote:
          'After two failed listings I was worn out. Gold Coast sent a fair number the same week and let us pick the closing date around our move. It finally felt easy.',
        name: 'James R.',
        detail: 'Fort Lauderdale · Relocating for work',
      },
      {
        initials: 'PL',
        quote:
          'I needed to move quickly and I was nervous about being taken advantage of. They were honest, local, and the number they sent was the number we got at closing.',
        name: 'Patricia L.',
        detail: 'Boca Raton · Downsizing after retirement',
      },
    ],
  },
  comparison: {
    eyebrow: 'Us vs. listing',
    heading: 'Selling to us vs. listing with an agent.',
    lede: 'Same home, two very different paths. Here’s how they stack up, line by line.',
    rows: [
      ['Commissions & fees', '✓ None — we don’t charge any', '✕ 5–6% agent commission'],
      ['Closing costs', '✓ We cover standard closing costs', '✕ Typically 1–3%, paid by you'],
      ['Repairs required', '✓ None — we buy as-is', '✕ Often required before listing'],
      ['Inspection contingency', '✓ None — no contingencies', '✕ Buyer’s inspection can re-trade the price'],
      ['Average days to close', '✓ As few as 14 days', '✕ 60–90+ days'],
      ['Number of showings', '✓ Zero — no strangers in your home', '✕ Ongoing, on the buyer’s schedule'],
      ['Closing date flexibility', '✓ You pick the date', '✕ Dictated by the buyer’s lender'],
      ['Cleanout assistance', '✓ Included — our Move On Package', '✕ Not provided'],
    ],
  },
  faqs: {
    eyebrow: 'Questions',
    heading: 'Straight answers to the things sellers ask.',
    rows: [
      {
        question: 'Are you just going to lowball me?',
        answer:
          'No. We pull recent comparable sales in your immediate neighborhood, factor in the home’s condition and any work it needs, and underwrite the deal in house. You get a fair, data-backed number you can check against the comps — not a throwaway placeholder.',
      },
      {
        question: 'How do you calculate your offer?',
        answer:
          'We start from the after-repair value (ARV) based on local comps, then subtract the cost of any repairs plus our holding and transaction costs. What’s left is your cash price. We’ll walk you through the math so the number makes sense.',
      },
      {
        question: 'What if I still have a mortgage on the home?',
        answer:
          'That’s normal — most homes we buy still have a mortgage. Your payoff comes out of the sale proceeds at closing, and the title company settles it directly with your lender. You collect whatever is left over.',
      },
      {
        question: 'What if the house needs major repairs?',
        answer:
          'Bring it on. Roof, foundation, fire or storm damage, code violations — we buy as-is and underwrite around it. You don’t fix, clean, or stage anything before closing.',
      },
      {
        question: 'How fast can you actually close?',
        answer:
          'We’ve closed in as few as 14 days. Because we pay cash, there’s no lender, no appraisal delay, and no financing fall-through. If you need more time, pick a later date — it’s your call.',
      },
      {
        question: 'Do I need to be present at closing?',
        answer:
          'No. Closings run through a local title company and can be done remotely with a mobile notary if that’s easier. Sign where it suits you, and your funds are wired or cut as a check.',
      },
      {
        question: 'What areas do you buy in?',
        answer:
          'We buy across Miami-Dade and Broward — Miami, Hollywood, Fort Lauderdale, Pembroke Pines, Miramar, Hialeah, Homestead, and the surrounding neighborhoods. If you’re nearby and not sure, just ask.',
      },
    ],
  },
  offer: {
    eyebrow: 'Get your offer',
    heading: 'See your no-obligation cash offer.',
    lede:
      'Tell us about your property and we’ll respond within 24 hours with a fair, underwritten number.',
    phoneText: 'Prefer to talk?',
    phoneLabel: ['(786)', '983', '5811'].join(' '),
    phoneHref: ['tel:+1', '786', '983', '5811'].join(''),
  },
  footer: {
    description: 'A South Florida cash buyer. We source, underwrite, and stand behind every offer.',
    bottomLeft: '© 2026 Gold Coast Home Buyers · W & Co LLC · Hollywood, FL',
    bottomRight: 'Serving Miami, Fort Lauderdale, Boca Raton, West Palm Beach & all of South Florida',
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

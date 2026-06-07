export const buyerHomeContent = {
  seo: {
    title: 'Off-Market Investment Properties | Gold Coast Home Buyers',
    description:
      'Browse public off-market investment opportunities from Gold Coast Home Buyers and join the buyers list for first access to new South Florida deals.',
    canonicalPath: '/',
  },
  hero: {
    eyebrow: 'Gold Coast Deals',
    heading: 'Off-market investment properties in South Florida',
    subheading:
      'Public deal cards show only opportunities approved for buyer-facing visibility. Join the buyers list to get notified when new properties become available.',
    microTrust: 'No buyer login required. Public inventory is filtered before it reaches this page.',
    trustPills: ['Off-market opportunities', 'Cash and hard-money friendly', 'South Florida focus'],
  },
  howItWorks: [
    {
      title: 'Join the buyers list',
      text: 'Share your email now and progressively add optional preferences like areas, property types, budget, and purchase method.',
    },
    {
      title: 'Review public deal pages',
      text: 'Browse active public opportunities with high-level location, property details, approved media placeholders, and underwriting notes.',
    },
    {
      title: 'Raise your hand',
      text: 'Use the deal-interest CTA on a detail page. The form contract is wired for the secure intake endpoint coming in slice 6.',
    },
  ],
  valueProps: [
    {
      icon: '🔒',
      title: 'Visibility controlled',
      text: 'Draft, hidden, preview, archived, cancelled, and internal-only deals are filtered before reaching buyer pages.',
    },
    {
      icon: '📍',
      title: 'Address privacy first',
      text: 'Exact addresses stay private unless a deal is explicitly marked for public address disclosure.',
    },
    {
      icon: '🖼️',
      title: 'Safe public media',
      text: 'Public media must render only after visibility checks and through app-mediated public media paths.',
    },
  ],
  personas: [
    {
      icon: '🏚️',
      title: 'Fix-and-flip buyers',
      text: 'Quickly screen public opportunities before requesting diligence materials through the deal-interest contract.',
    },
    {
      icon: '🏘️',
      title: 'Rental investors',
      text: 'Review high-level location, specs, and estimated numbers while exact private details remain protected.',
    },
    {
      icon: '🤝',
      title: 'Cash and hard-money buyers',
      text: 'Browse public inventory without a login and join the buyer list for future notifications.',
    },
  ],
  emptyState: {
    title: 'Deals coming soon',
    text: 'There are no active public deals to show right now. Join the buyers list to be notified first when a new opportunity is released.',
  },
  soldProof: {
    eyebrow: 'Recent proof',
    heading: "Deals we've closed",
    text: 'Sold deals are shown only as social proof and are not included in the active public deal listing.',
  },
  cta: {
    heading: 'Get notified when public deals go live',
    text: 'Join with email only now. Optional buy-box details can be added progressively when you are ready.',
    label: 'Join Buyers List',
    href: '/join/',
  },
}

export const buyerFaqContent = {
  seo: {
    title: 'Buyer FAQ | Gold Coast Deals',
    description:
      'Answers to common questions about Gold Coast Home Buyers off-market investment opportunities, buyer list alerts, deal review, and due diligence.',
    canonicalPath: '/faq/',
  },
  heading: 'Frequently asked questions',
  subheading: 'Everything buyers should know before reviewing a Gold Coast deal.',
  faqs: [
    {
      question: 'What is a public Gold Coast deal page?',
      answer:
        'It is a buyer-facing summary for an off-market opportunity that has been marked public and is in an approved public status. Private internal records never appear on these pages.',
    },
    {
      question: 'Why do some listings show a neighborhood or city instead of a street address?',
      answer:
        'Exact property addresses are withheld by default. A street address appears only when the deal is explicitly configured to show the exact address publicly.',
    },
    {
      question: 'Can I browse deals without logging in?',
      answer:
        'Yes. Public buyers can browse active public deals without an account. Joining the buyers list is optional and helps us notify you about future opportunities.',
    },
    {
      question: 'What happens when I submit deal interest?',
      answer:
        'This slice defines the form contract and local endpoint target. The secure persistence and notification API route is implemented in slice 6, so the form does not show a fake success state here.',
    },
    {
      question: 'Are sold deals available?',
      answer:
        'No. Sold deals may appear only as social proof when they are public, and they are excluded from the active listing.',
    },
    {
      question: 'Do buyers need to do their own due diligence?',
      answer:
        'Yes. Buyers are responsible for inspections, title review, verifying numbers, financing, and all independent due diligence before making an offer.',
    },
  ],
}

export const buyerFAQs = buyerFaqContent.faqs

export const buyerJoinContent = {
  seo: {
    title: 'Join the Buyers List | Gold Coast Deals',
    description:
      'Join the Gold Coast Home Buyers buyer list with a lightweight email-first form and optional investment preferences.',
    canonicalPath: '/join/',
  },
  heading: 'Join the buyers list',
  subheading:
    'Email is the only required field. Add optional preferences now or update them later as your buying criteria change.',
}

export const buyerSignupOptions = {
  buyerTypes: [
    { label: 'Fix-and-flip buyer', value: 'fix_and_flip' },
    { label: 'Buy-and-hold investor', value: 'buy_and_hold' },
    { label: 'Wholesaler / dispo partner', value: 'wholesaler' },
    { label: 'Builder / developer', value: 'builder' },
    { label: 'Other buyer type', value: 'other' },
  ],
  areas: [
    { label: 'Broward County', value: 'broward' },
    { label: 'Miami-Dade County', value: 'miami_dade' },
    { label: 'Palm Beach County', value: 'palm_beach' },
    { label: 'Other South Florida areas', value: 'other_south_florida' },
  ],
  propertyTypes: [
    { label: 'Single family', value: 'single_family' },
    { label: 'Condo / townhouse', value: 'condo_townhouse' },
    { label: 'Duplex / small multifamily', value: 'small_multifamily' },
    { label: 'Land', value: 'land' },
  ],
  priceRanges: [
    { label: 'Under $200k', value: 'under_200k' },
    { label: '$200k–$350k', value: '200k_350k' },
    { label: '$350k–$500k', value: '350k_500k' },
    { label: '$500k+', value: '500k_plus' },
  ],
  purchaseMethods: [
    { label: 'Cash', value: 'cash' },
    { label: 'Hard money', value: 'hard_money' },
    { label: 'Private money', value: 'private_money' },
    { label: 'Other / depends on deal', value: 'other' },
  ],
}

export const buyerDueDiligenceDisclaimer =
  'Deal information is provided for preliminary review only. Buyers are responsible for inspections, title review, financing, verifying all numbers, and independent due diligence before making an offer.'

export const buyerFooterDisclaimer =
  'All properties are sold as-is for cash or hard money unless otherwise stated. Buyers are responsible for independent due diligence and verification of all information. ARV, rehab estimates, closing costs, and projected returns are estimates only and are not guarantees. Gold Coast Home Buyers is not a licensed real estate brokerage.'

export const buyerSiteDisclaimer = buyerFooterDisclaimer

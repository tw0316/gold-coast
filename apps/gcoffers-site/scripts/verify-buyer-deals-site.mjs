#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cwd, exit } from 'node:process'

const root = cwd()
const failures = []
const passes = []

const assert = (condition, message) => {
  if (condition) {
    passes.push(message)
  } else {
    failures.push(message)
  }
}

const exists = (relativePath) => existsSync(join(root, relativePath))
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const requiredFiles = [
  'src/app/(frontend)/page.tsx',
  'src/app/(buyer)/layout.tsx',
  'src/app/(buyer)/join/page.tsx',
  'src/app/(buyer)/faq/page.tsx',
  'src/app/(buyer)/deals/[slug]/page.tsx',
  'src/components/buyer/BuyerHomePage.tsx',
  'src/components/buyer/BuyerDealCard.tsx',
  'src/components/buyer/BuyerDealDetailPage.tsx',
  'src/components/buyer/BuyerEmailCapture.tsx',
  'src/components/buyer/BuyerSignupForm.tsx',
  'src/components/buyer/DealInterestForm.tsx',
  'src/components/buyer/BuyerHeader.tsx',
  'src/components/buyer/BuyerFooter.tsx',
  'src/fixtures/buyerDeals.ts',
  'src/lib/buyer/content.ts',
  'src/lib/buyer/formContract.ts',
  'src/lib/buyer/formContracts.ts',
  'src/lib/deals/publicBuyerDeals.ts',
  'src/lib/deals/visibility.ts',
  'src/lib/media/publicMedia.ts',
]

for (const file of requiredFiles) {
  assert(exists(file), `${file} exists`)
}

const pkg = JSON.parse(read('package.json'))
assert(
  pkg.scripts?.['verify:buyer-deals-site'] === 'node scripts/verify-buyer-deals-site.mjs',
  'package.json exposes verify:buyer-deals-site script',
)

const frontendRoot = read('src/app/(frontend)/page.tsx')
assert(frontendRoot.includes('getSurfaceForHost'), 'root route remains host-aware')
assert(frontendRoot.includes('routeSurface === \'buyer\''), 'root route dispatches buyer surface by host')
assert(frontendRoot.includes('<BuyerHomePage'), 'buyer host root renders BuyerHomePage')
assert(frontendRoot.includes('<SellerHomePage'), 'seller host root still renders SellerHomePage')
const buyerRootMetadata = frontendRoot.match(/if \(routeSurface === 'buyer'\) \{[\s\S]*?return \{([\s\S]*?)\n    \}\n  \}/)?.[1] ?? ''
assert(
  buyerRootMetadata.includes("metadataBase: new URL('https://deals.gcoffers.com')"),
  'buyer root metadata explicitly sets deals.gcoffers.com metadataBase',
)
assert(
  buyerRootMetadata.includes("canonical: 'https://deals.gcoffers.com/'"),
  'buyer root metadata uses deals.gcoffers.com canonical URL',
)
assert(
  buyerRootMetadata.includes("url: 'https://deals.gcoffers.com/'"),
  'buyer root OpenGraph URL uses deals.gcoffers.com',
)
assert(!buyerRootMetadata.includes('/assets/og-image.jpg'), 'buyer root OpenGraph metadata does not inherit seller OG image')
assert(!exists('src/app/(buyer)/page.tsx'), 'no conflicting buyer route-group root page exists')
assert(!exists('src/app/(frontend)/join/page.tsx'), 'no duplicate frontend join route conflicts with buyer join route')
assert(!exists('src/app/(frontend)/faq/page.tsx'), 'no duplicate frontend FAQ route conflicts with buyer FAQ route')
assert(!exists('src/app/(frontend)/deals/[slug]/page.tsx'), 'no duplicate frontend deal detail route conflicts with buyer deal detail route')

const visibility = read('src/lib/deals/visibility.ts')
for (const marker of [
  "PUBLIC_DEAL_STATUSES = [\n  'coming_soon',\n  'available',\n  'under_contract',\n  'sold',",
  "PUBLIC_ACTIVE_DEAL_STATUSES = [\n  'coming_soon',\n  'available',\n  'under_contract',",
  "PUBLIC_SOLD_DEAL_STATUS = 'sold'",
  "websiteVisibility === 'public'",
  "PUBLIC_ACTIVE_DEAL_STATUSES.includes",
  "dealStatus === PUBLIC_SOLD_DEAL_STATUS",
  'sanitizeMediaReferenceForPublic',
  'isExactAddressPublic(deal)',
]) {
  assert(visibility.includes(marker), `deal visibility helper marker present: ${marker.split('\n')[0]}`)
}

const publicMedia = read('src/lib/media/publicMedia.ts')
assert(
  publicMedia.includes("buildAppMediatedPublicMediaPath") && publicMedia.includes("/api/media/public/"),
  'public media helper builds app-mediated public media paths',
)
assert(
  publicMedia.includes('containsExactAddressOrPrivateDetails !== true'),
  'public media helper rejects media containing exact/private details',
)

const buyerDealsLib = read('src/lib/deals/publicBuyerDeals.ts')
for (const marker of [
  'isPublicActiveDeal',
  'isPublicSoldProofDeal',
  'isPublicDealVisible',
  'sanitizeDealForPublic',
  'getPublicLocationLabel',
  'getBuyerPublicActiveDeals',
  'getBuyerPublicSoldProofDeals',
  'getBuyerPublicDealBySlug',
  'getBuyerPublicDealSlugs',
]) {
  assert(buyerDealsLib.includes(marker), `buyer public deal helper uses ${marker}`)
}
assert(
  /getBuyerPublicActiveDeals[\s\S]*\.filter\(isPublicActiveDeal\)/.test(buyerDealsLib),
  'active listing helper filters with the public active predicate',
)
assert(
  /getBuyerPublicSoldProofDeals[\s\S]*\.filter\(isPublicSoldProofDeal\)/.test(buyerDealsLib),
  'sold proof helper filters only public sold proof deals',
)
assert(
  /getBuyerPublicDealBySlug[\s\S]*!isPublicDealVisible\(deal\)/.test(buyerDealsLib),
  'deal detail helper rejects non-public/non-approved deal statuses',
)
assert(
  /getBuyerPublicDealSlugs[\s\S]*filter\(isPublicDealVisible\)/.test(buyerDealsLib),
  'public slug helper excludes hidden/draft/cancelled/internal-only deals',
)

const fixtures = read('src/fixtures/buyerDeals.ts')
for (const marker of [
  "websiteVisibility: 'public'",
  "dealStatus: 'coming_soon'",
  "dealStatus: 'available'",
  "dealStatus: 'under_contract'",
  "dealStatus: 'sold'",
  "websiteVisibility: 'hidden'",
  "websiteVisibility: 'preview'",
  "websiteVisibility: 'archived'",
  "dealStatus: 'draft'",
  "dealStatus: 'cancelled'",
  "exactAddress: 'REDACTED_EXACT_ADDRESS'",
  'showExactAddressPublicly: false',
]) {
  assert(fixtures.includes(marker), `buyer fixtures cover marker: ${marker}`)
}
assert(!/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(fixtures), 'buyer fixtures contain no raw email addresses')
assert(!/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(fixtures), 'buyer fixtures contain no raw phone numbers')

const homePage = read('src/components/buyer/BuyerHomePage.tsx')
assert(homePage.includes('getBuyerPublicActiveDeals()'), 'buyer home reads public active deals')
assert(homePage.includes('getBuyerPublicSoldProofDeals()'), 'buyer home reads public sold proof deals separately')
assert(homePage.includes('data-buyer-page="home"'), 'buyer home identifies buyer surface for verification')
assert(homePage.includes('Only public deals with status coming soon, available, or under contract'), 'buyer listing copy documents active predicate')
assert(homePage.includes('Sold proof renders only public deals with status sold'), 'sold proof copy documents sold-only predicate')

const emailCapture = read('src/components/buyer/BuyerEmailCapture.tsx')
assert(emailCapture.includes('href="/join/"'), 'buyer home email CTA links to /join/ without query params')
assert(!emailCapture.includes('method="get"'), 'buyer home email CTA does not submit email with GET')
assert(!emailCapture.includes('action="/join/"'), 'buyer home email CTA does not use a URL-prefill form action')
assert(!emailCapture.includes('name="email"'), 'buyer home email CTA does not put email values in URLs')
assert(!emailCapture.includes('type="email"'), 'buyer home email CTA has no email input on the GET surface')

const joinRoute = read('src/app/(buyer)/join/page.tsx')
const joinPage = read('src/components/buyer/BuyerJoinPage.tsx')
assert(!joinRoute.includes('searchParams'), 'buyer join route does not read email from URL search params')
assert(!joinRoute.includes('params.email'), 'buyer join route does not inspect email query params')
assert(!joinRoute.includes('prefilledEmail'), 'buyer join route does not forward URL-prefilled email')
assert(!joinPage.includes('prefilledEmail'), 'buyer join page does not accept URL-prefilled email')

const detailRoute = read('src/app/(buyer)/deals/[slug]/page.tsx')
assert(detailRoute.includes('notFound()'), 'deal detail route returns 404 for missing/non-public deals')
assert(detailRoute.includes('getBuyerPublicDealBySlug'), 'deal detail route uses public deal lookup helper')
assert(detailRoute.includes('getBuyerPublicDealSlugs'), 'deal detail static params come from public slugs only')
assert(detailRoute.includes('dynamicParams = false'), 'deal detail route prevents unknown dynamic public slugs')

const detailPage = read('src/components/buyer/BuyerDealDetailPage.tsx')
assert(detailPage.includes('deal.exactAddress ?'), 'deal detail renders exact address only when present after sanitization')
assert(
  detailPage.includes('Exact address is hidden by default') && !detailPage.includes('REDACTED_EXACT_ADDRESS'),
  'deal detail UI documents default address suppression without embedding placeholder addresses',
)
assert(
  detailPage.includes('<h2 id="buyer-deal-numbers-title">Numbers Breakdown</h2>'),
  'deal numbers section aria label points to a visible heading',
)
assert(
  !detailPage.includes('className="buyer-detail-card" id="buyer-deal-numbers-title"'),
  'deal numbers section does not label the section with the article container id',
)
assert(detailPage.includes('<DealInterestForm'), 'deal detail page includes deal-interest CTA/form contract')
assert(!/success|thank you|submitted/i.test(detailPage), 'deal detail page does not claim fake persistence success')

const formContract = read('src/lib/buyer/formContract.ts')
const formContractsCompat = read('src/lib/buyer/formContracts.ts')
assert(formContractsCompat.trim() === "export * from './formContract'", 'plural buyer formContracts module re-exports canonical formContract')
assert(!/export const\s+/.test(formContractsCompat), 'plural buyer formContracts module does not redeclare constants')
assert(!formContract.includes("from './formContracts'"), 'canonical buyer formContract does not import from compatibility module')
for (const marker of [
  "BUYER_SIGNUP_POST_TARGET = '/api/buyer-signups'",
  "DEAL_INTEREST_POST_TARGET = '/api/deal-interest'",
  "BUYER_SIGNUP_FORM_CONTRACT = 'slice-6-s3-first-buyer-signup'",
  "DEAL_INTEREST_FORM_CONTRACT = 'slice-6-s3-first-deal-interest'",
  "DEAL_INTEREST_PHONE_CONSENT_CONTRACT = 'phone-requires-service-consent'",
  'buyerSignupFormContract',
  'dealInterestFormContract',
  "{ name: 'contract', required: true }",
  "{ name: 'serviceConsent', required: false }",
  "{ name: 'phoneConsentContract', required: true }",
]) {
  assert(formContract.includes(marker), `form contract marker present: ${marker}`)
}

const signupForm = read('src/components/buyer/BuyerSignupForm.tsx')
const interestForm = read('src/components/buyer/DealInterestForm.tsx')
assert(signupForm.includes("from '@/lib/buyer/formContract'"), 'buyer signup form imports canonical form contract module')
assert(!signupForm.includes('prefilledEmail'), 'buyer signup form does not prefill email from URL data')
assert(signupForm.includes('action={BUYER_SIGNUP_POST_TARGET}'), 'buyer signup form posts to future local endpoint')
assert(signupForm.includes('method="post"'), 'buyer signup form uses POST')
assert(signupForm.includes('name="email"') && signupForm.includes('required'), 'buyer signup form requires email')
for (const field of ['fullName', 'phone', 'buyerType', 'areas', 'propertyTypes', 'priceRange', 'purchaseMethod']) {
  assert(signupForm.includes(`name="${field}"`), `buyer signup form includes optional/progressive field: ${field}`)
}
for (const checkbox of ['serviceConsent', 'marketingConsent']) {
  const pattern = new RegExp(`<input[^>]+name="${checkbox}"[^>]*>`, 's')
  const tag = signupForm.match(pattern)?.[0] ?? ''
  assert(tag.includes('type="checkbox"'), `${checkbox} is an explicit checkbox`)
  assert(!/\b(defaultChecked|checked)\b/.test(tag), `${checkbox} checkbox is not prechecked`)
}
assert(signupForm.includes('name="contract"'), 'buyer signup form sends explicit contract marker')
assert(signupForm.includes('future route must write to S3 first') || signupForm.includes('future route must write to S3'), 'buyer signup copy documents future S3-first persistence')
assert(!/success|thank you|submitted/i.test(signupForm), 'buyer signup form does not claim fake persistence success')

assert(interestForm.includes("from '@/lib/buyer/formContract'"), 'deal interest form imports canonical form contract module')
assert(interestForm.includes('action={DEAL_INTEREST_POST_TARGET}'), 'deal interest form posts to future local endpoint')
assert(interestForm.includes('method="post"'), 'deal interest form uses POST')
assert(interestForm.includes('name="dealSlug"'), 'deal interest form includes dealSlug')
assert(interestForm.includes('name="email"') && interestForm.includes('required'), 'deal interest form requires email')
assert(interestForm.includes('name="phone"') && interestForm.includes('type="tel"'), 'deal interest form keeps phone optional as tel input')
assert(interestForm.includes('name="phoneConsentContract"'), 'deal interest form sends explicit phone-consent contract marker')
const interestConsentTag = interestForm.match(/<input[^>]+name="serviceConsent"[^>]*>/s)?.[0] ?? ''
assert(interestConsentTag.includes('type="checkbox"'), 'deal interest service/SMS consent is an explicit checkbox')
assert(!/\b(defaultChecked|checked)\b/.test(interestConsentTag), 'deal interest service/SMS consent is not prechecked')
assert(interestForm.includes('If I provide a phone number') && interestForm.includes('Consent is not a condition of purchase'), 'deal interest phone collection has explicit service/SMS consent copy')
assert(interestForm.includes('<h2 id="buyer-interest-title">'), 'active deal interest section has a visible aria-labelledby target')
assert(interestForm.includes('name="contract"'), 'deal interest form sends explicit contract marker')
assert(interestForm.includes('future handler must persist to S3'), 'deal interest copy documents future S3-first persistence')
assert(!/success|thank you|submitted/i.test(interestForm), 'deal interest form does not claim fake persistence success')

const sourceDirsToScan = [
  'src/app/(buyer)',
  'src/components/buyer',
  'src/lib/buyer',
  'src/lib/deals',
  'src/fixtures',
]
const sourceFilesToScan = []
const collectSourceFiles = (dir) => {
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const relativePath = `${dir}/${entry.name}`
    if (entry.isDirectory()) {
      collectSourceFiles(relativePath)
    } else if (/\.(ts|tsx|css|mjs)$/.test(entry.name)) {
      sourceFilesToScan.push(relativePath)
    }
  }
}
for (const dir of sourceDirsToScan) {
  collectSourceFiles(dir)
}

const prohibitedRawUrl = /https?:\/\/[^\s'"`]+/i
const prohibitedStorageUrl = /(s3[.-][a-z0-9-]+\.amazonaws\.com|amazonaws\.com\/[^\s'"`]+|storage\.googleapis\.com|cloudfront\.net)/i
const prohibitedLegacyEndpoint = /\/api\/submit-lead|execute-api/i
for (const file of sourceFilesToScan) {
  const source = read(file)
  assert(!prohibitedLegacyEndpoint.test(source), `${file} does not contain retired legacy live endpoints`)
  assert(!prohibitedStorageUrl.test(source), `${file} does not contain raw storage/CDN media URLs`)
  if (file.startsWith('src/app/(buyer)') || file.startsWith('src/components/buyer') || file.startsWith('src/fixtures')) {
    const rawUrlScanSource = source.replaceAll('https://deals.gcoffers.com', '')
    assert(!prohibitedRawUrl.test(rawUrlScanSource), `${file} does not embed raw absolute URLs`)
  }
}

const piiAndSecretFilesToScan = [
  'package.json',
  'scripts/verify-buyer-deals-site.mjs',
  'src/app/(frontend)/page.tsx',
  'src/app/(frontend)/styles.css',
  ...sourceFilesToScan,
]
const piiAndSecretPatterns = [
  { label: 'raw email address', pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { label: 'North American phone number', pattern: /\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/ },
  { label: 'Slack webhook URL', pattern: /hooks\.slack\.com/i },
  { label: 'AWS access key id', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: 'GitHub token', pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  { label: 'private key marker', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  {
    label: 'assignment-style secret/token/api key',
    pattern: /(?<!REDACTED_)(?:secret|token|api[_-]?key|password)\s*[:=]\s*['"][^'"]+['"]/i,
  },
  {
    label: 'street-address-looking value',
    pattern: /\b\d{1,6}\s+[A-Za-z0-9 .'-]+\s+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Blvd|Boulevard|Ct|Court|Way)\b/i,
  },
]

for (const file of piiAndSecretFilesToScan) {
  const source = read(file)
  for (const { label, pattern } of piiAndSecretPatterns) {
    assert(!pattern.test(source), `${file} contains no ${label}`)
  }
}

if (failures.length > 0) {
  console.error('Buyer deals site verification failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  exit(1)
}

console.log('Buyer deals site verification passed')
for (const message of passes) {
  console.log(`- ${message}`)
}

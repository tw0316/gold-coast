#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
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
  'src/app/(frontend)/layout.tsx',
  'src/app/(frontend)/page.tsx',
  'src/app/(frontend)/styles.css',
  'src/app/(frontend)/privacy-policy/page.tsx',
  'src/app/(frontend)/terms/page.tsx',
  'src/app/(frontend)/get-your-offer/page.tsx',
  'src/components/seller/SellerHomePage.tsx',
  'src/components/seller/SellerLeadForm.tsx',
  'src/components/seller/SellerHeroAddressBar.tsx',
  'src/components/seller/SellerLegalPage.tsx',
  'src/components/seller/SellerHeader.tsx',
  'src/components/seller/SellerFooter.tsx',
  'src/fixtures/sellerPages.ts',
  'src/lib/seller/content.ts',
  'src/lib/seller/formContract.ts',
]

for (const file of requiredFiles) {
  assert(exists(file), `${file} exists`)
}

const pkg = JSON.parse(read('package.json'))
assert(
  pkg.scripts?.['verify:seller-site'] === 'node scripts/verify-seller-site.mjs',
  'package.json exposes verify:seller-site script',
)

const rootRoute = read('src/app/(frontend)/page.tsx')
assert(rootRoute.includes('getSurfaceForHost'), 'root route keeps host-aware surface detection')
assert(rootRoute.includes('SellerHomePage'), 'root route renders the migrated seller homepage component')
assert(!exists('src/app/(seller)/page.tsx'), 'no parallel /(seller) root route conflicts with host dispatch')
assert(!rootRoute.includes('Seller site scaffold'), 'seller scaffold copy has been removed from the root route')

const redirectRoute = read('src/app/(frontend)/get-your-offer/page.tsx')
assert(redirectRoute.includes("redirect('/#offer')"), '/get-your-offer redirects to the current seller offer CTA')
assert(redirectRoute.includes('index: false'), '/get-your-offer stays noindex while retired')

const formSource = read('src/components/seller/SellerLeadForm.tsx')
const formContract = read('src/lib/seller/formContract.ts')
assert(formContract.includes("SELLER_LEAD_POST_TARGET = '/api/seller-leads'"), 'seller lead POST target is /api/seller-leads')
assert(formSource.includes('method="post"'), 'seller lead form uses POST')
assert(formSource.includes('action={SELLER_LEAD_POST_TARGET}'), 'seller lead form posts to the internal contract target')
assert(formSource.includes('data-seller-lead-contract="slice-6-s3-first"'), 'seller lead form documents the slice 6 S3-first contract')

const inputTags = formSource.match(/<input[\s\S]*?>/g) ?? []
const findInputByName = (name) => inputTags.find((tag) => tag.includes(`name="${name}"`) || tag.includes(`name='${name}'`))

for (const field of ['fullName', 'address', 'email']) {
  const tag = findInputByName(field)
  assert(Boolean(tag), `seller lead form includes ${field} input`)
  assert(Boolean(tag?.includes('required')), `${field} input is required in the baseline form contract`)
}

const phoneTag = findInputByName('phone')
assert(Boolean(phoneTag), 'seller lead form includes phone input')
assert(!Boolean(phoneTag?.includes('required')), 'phone input is optional in the seller lead form contract')

for (const field of ['source', 'page', 'referrer', 'userAgent']) {
  const tag = findInputByName(field)
  assert(Boolean(tag), `seller lead form includes ${field} context field`)
  assert(Boolean(tag?.includes('type="hidden"')), `${field} context field is hidden`) 
}

for (const field of ['serviceConsent', 'marketingConsent']) {
  const tag = findInputByName(field)
  assert(Boolean(tag), `seller lead form includes ${field} checkbox`)
  assert(Boolean(tag?.includes('type="checkbox"')), `${field} is an explicit checkbox`)
  assert(!/\b(defaultChecked|checked)\b/.test(tag ?? ''), `${field} checkbox is not prechecked`)
}
assert(!Boolean(findInputByName('serviceConsent')?.includes('required')), 'serviceConsent is optional unless phone is provided')

const sellerContentSources = [
  read('src/fixtures/sellerPages.ts'),
  read('src/components/seller/SellerHomePage.tsx'),
  read('src/components/seller/SellerLegalPage.tsx'),
  read('src/app/(frontend)/styles.css'),
].join('\n')

for (const marker of [
  'Gold Coast Home Buyers',
  'The straightforward way to sell.',
  '4.9 from 400+ South Florida homeowners',
  'How it works',
  'Why sellers choose us',
  'Us vs. listing',
  'Neighbors who trusted us',
  'Questions',
  'See your no-obligation cash offer.',
  'Privacy Policy',
  'Terms of Service',
  'Gold Coast Offers LLC',
]) {
  assert(sellerContentSources.includes(marker), `migrated seller content marker present: ${marker}`)
}

const fixtureSource = read('src/fixtures/sellerPages.ts')
for (const marker of [
  "surface: 'seller'",
  "surface: 'shared'",
  "status: 'published'",
  "sectionType: 'hero'",
  "sectionType: 'two_column'",
  "sectionType: 'cta'",
  "sectionType: 'legal'",
  'sellerPageSeeds',
]) {
  assert(fixtureSource.includes(marker), `Payload Pages seed mapping marker present: ${marker}`)
}

const cssSource = read('src/app/(frontend)/styles.css')
for (const marker of ['--gchb-gold: #F5C518', '--gchb-navy: #1A3A6B', '.seller-hero', '.address-bar', '.comparison-table', '.offer-section', '.legal-page']) {
  assert(cssSource.includes(marker), `seller CSS brand/layout marker present: ${marker}`)
}

for (const asset of [
  'public/assets/favicon.ico',
  'public/assets/hero-home.png',
  'public/assets/logo-full-on-dark.svg',
  'public/assets/logo-full-on-light.svg',
  'public/assets/fonts/SourceSans3-VariableFont_wght.ttf',
  'public/assets/og-image.jpg',
]) {
  const assetPath = join(root, asset)
  assert(existsSync(assetPath) && statSync(assetPath).isFile() && statSync(assetPath).size > 0, `${asset} exists and is non-empty`)
}

const sourceDirsToScan = ['src/app/(frontend)', 'src/components/seller', 'src/lib/seller', 'src/fixtures']
const sourceFilesToScan = []
const collectSourceFiles = (dir) => {
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const relativePath = `${dir}/${entry.name}`
    if (entry.isDirectory()) {
      collectSourceFiles(relativePath)
    } else if (/\.(ts|tsx|css)$/.test(entry.name)) {
      sourceFilesToScan.push(relativePath)
    }
  }
}
for (const dir of sourceDirsToScan) {
  collectSourceFiles(dir)
}

const retiredSubmitLeadPath = String.raw`/api/` + 'submit-lead'
const prohibitedLegacyEndpointPatterns = [
  /https:\/\/[^\s'"`]+execute-api[^\s'"`]+\/api\/submit-lead/i,
  new RegExp(retiredSubmitLeadPath.replaceAll('/', String.raw`\\/`), 'i'),
]
for (const file of sourceFilesToScan) {
  const source = read(file)
  const containsLegacyEndpoint = prohibitedLegacyEndpointPatterns.some((pattern) => pattern.test(source))
  assert(!containsLegacyEndpoint, `${file} does not contain the retired legacy live seller API endpoint`)
}

if (failures.length > 0) {
  console.error('Seller site verification failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  exit(1)
}

console.log('Seller site verification passed')
for (const message of passes) {
  console.log(`- ${message}`)
}

#!/usr/bin/env node
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { cwd, exit } from 'node:process'
import ts from 'typescript'

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
  'src/app/api/seller-leads/route.ts',
  'src/app/api/buyer-signups/route.ts',
  'src/app/api/deal-interest/route.ts',
  'src/lib/forms/s3FirstFormPipeline.ts',
  'src/lib/forms/routeHandlers.ts',
  'src/components/forms/useInlineFormSubmit.ts',
  'src/components/seller/SellerLeadForm.tsx',
  'src/components/buyer/BuyerSignupForm.tsx',
  'src/components/buyer/BuyerListSignupForm.tsx',
  'src/components/buyer/DealInterestForm.tsx',
  'src/lib/seller/formContract.ts',
  'src/lib/buyer/formContract.ts',
  'scripts/verify-s3-first-form-pipeline.mjs',
]

for (const file of requiredFiles) {
  assert(exists(file), `${file} exists`)
}

const pkg = JSON.parse(read('package.json'))
assert(
  pkg.scripts?.['verify:s3-first-form-pipeline'] === 'node scripts/verify-s3-first-form-pipeline.mjs',
  'package.json exposes verify:s3-first-form-pipeline script',
)

const sellerRoute = read('src/app/api/seller-leads/route.ts')
const buyerRoute = read('src/app/api/buyer-signups/route.ts')
const dealRoute = read('src/app/api/deal-interest/route.ts')
for (const [label, source, handler] of [
  ['seller lead', sellerRoute, 'handleSellerLeadRoute'],
  ['buyer signup', buyerRoute, 'handleBuyerSignupRoute'],
  ['deal interest', dealRoute, 'handleDealInterestRoute'],
]) {
  assert(source.includes("runtime = 'nodejs'"), `${label} route uses nodejs runtime`)
  assert(source.includes("dynamic = 'force-dynamic'"), `${label} route is force dynamic`)
  assert(source.includes('export function POST'), `${label} route exports POST`)
  assert(source.includes('export function OPTIONS'), `${label} route exports OPTIONS`)
  assert(source.includes(handler), `${label} route delegates to focused pipeline handler`)
}

const routeHandlers = read('src/lib/forms/routeHandlers.ts')
const inlineFormSubmit = read('src/components/forms/useInlineFormSubmit.ts')
for (const marker of [
  'parseLimitedRequestBody(request)',
  'hasHoneypotValue(body)',
  'checkFormRateLimit({',
  'submitS3FirstForm(built.submission',
  'createConfiguredS3Writer',
  'S3PersistenceError',
  'sideEffectsSkipped: true',
]) {
  assert(routeHandlers.includes(marker), `route handler contains pipeline marker: ${marker}`)
}
assert(routeHandlers.includes('message: getFormSuccessMessage'), 'public form response includes a user-facing success message')
assert(!routeHandlers.includes('s3: {'), 'public form response does not expose S3 bucket/key details')
assert(!routeHandlers.includes('sideEffects: result.sideEffects'), 'public form response does not expose side-effect diagnostics')
assert(inlineFormSubmit.includes('new URLSearchParams()'), 'inline public forms serialize submissions as URL-encoded bodies')
assert(inlineFormSubmit.includes('body.append(key, value)'), 'inline public form serialization preserves repeated field values')
assert(
  inlineFormSubmit.includes("'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'"),
  'inline public forms send the content type parsed by the S3-first route handler',
)
assert(!inlineFormSubmit.includes('body: new FormData(form)'), 'inline public forms do not send multipart bodies to URLSearchParams parser')
assert(inlineFormSubmit.includes('requireServiceConsentForPhone'), 'inline public form hook supports client-side phone consent validation')
assert(inlineFormSubmit.includes('setCustomValidity(phoneConsentMessage)'), 'inline public form hook points phone-consent errors at the service consent field')
assert(!inlineFormSubmit.includes('resetStatus'), 'inline public form hook does not expose unused status reset API')

const pipelineSource = read('src/lib/forms/s3FirstFormPipeline.ts')
for (const marker of [
  'MAX_FORM_BODY_BYTES',
  "HONEYPOT_FIELD_NAME = 'website'",
  'FORM_IDEMPOTENCY_WINDOW_MS',
  'FORM_IP_RATE_LIMIT',
  'FORM_EMAIL_RATE_LIMIT',
  'buyer-signups/${datePrefix}/buyer-${keyTimestamp}-${emailHash}.json',
  'deal-interest/${datePrefix}/${dealSlug}-${keyTimestamp}-${emailHash}.json',
  "['buyer-list', 'deals-website']",
  'interested-${dealSlug}',
  'Exact address omitted from the CRM note',
  'createSlackAlertMockEffect',
  'createEmailAlertMockEffect',
  'createAwsS3Writer',
  'createConfiguredS3Writer',
]) {
  assert(pipelineSource.includes(marker), `pipeline source contains marker: ${marker}`)
}

const sellerContract = read('src/lib/seller/formContract.ts')
const buyerContract = read('src/lib/buyer/formContract.ts')
assert(sellerContract.includes("SELLER_LEAD_HONEYPOT_FIELD = 'website'"), 'seller form contract names honeypot field')
assert(buyerContract.includes("BUYER_FORM_HONEYPOT_FIELD = 'website'"), 'buyer form contract names honeypot field')

const sellerForm = read('src/components/seller/SellerLeadForm.tsx')
const signupForm = read('src/components/buyer/BuyerSignupForm.tsx')
const listSignupForm = read('src/components/buyer/BuyerListSignupForm.tsx')
const interestForm = read('src/components/buyer/DealInterestForm.tsx')
for (const [label, source, fieldConstant] of [
  ['seller lead form', sellerForm, 'SELLER_LEAD_HONEYPOT_FIELD'],
  ['buyer signup form', signupForm, 'BUYER_FORM_HONEYPOT_FIELD'],
  ['buyer list signup form', listSignupForm, 'BUYER_FORM_HONEYPOT_FIELD'],
  ['deal interest form', interestForm, 'BUYER_FORM_HONEYPOT_FIELD'],
]) {
  assert(source.includes('className="sr-only"') && source.includes('Leave this field blank'), `${label} includes an accessible honeypot trap`)
  assert(source.includes(`name={${fieldConstant}}`), `${label} wires the shared honeypot field constant`)
}

for (const [label, source, field] of [
  ['seller service consent', sellerForm, 'serviceConsent'],
  ['seller marketing consent', sellerForm, 'marketingConsent'],
  ['buyer service consent', signupForm, 'serviceConsent'],
  ['buyer marketing consent', signupForm, 'marketingConsent'],
  ['buyer list service consent', listSignupForm, 'serviceConsent'],
  ['buyer list marketing consent', listSignupForm, 'marketingConsent'],
  ['deal interest service consent', interestForm, 'serviceConsent'],
]) {
  const tag = source.match(new RegExp(`<input[^>]+name="${field}"[^>]*>`, 's'))?.[0] ?? ''
  assert(tag.includes('type="checkbox"'), `${label} is a checkbox`)
  assert(!/\b(defaultChecked|checked)\b/.test(tag), `${label} is not prechecked`)
}

for (const [label, source] of [
  ['buyer signup form', signupForm],
  ['buyer list signup form', listSignupForm],
  ['deal interest form', interestForm],
]) {
  assert(source.includes('requireServiceConsentForPhone: true'), `${label} validates phone consent client-side before submit`)
}

const pipeline = await importPipelineModule()
const fixedNow = new Date('2026-02-03T04:05:06.007Z')
const safeEmail = ['buyer', 'redacted.invalid'].join('@')
const safeSellerEmail = ['seller', 'redacted.invalid'].join('@')
const safePhone = ['555', '010', '1000'].join('')
const metadata = {
  ipHash: pipeline.hashIdentifier('verification-ip'),
  userAgent: 'verification-agent',
}

const buyerBuild = pipeline.buildBuyerSignupSubmission(
  {
    email: safeEmail,
    fullName: '[REDACTED_NAME]',
    phone: safePhone,
    serviceConsent: 'true',
    marketingConsent: 'false',
    areas: ['broward'],
    buyerType: 'fix_and_flip',
    propertyTypes: ['single_family'],
    priceRange: 'under_200k',
    purchaseMethod: 'cash',
  },
  metadata,
  fixedNow,
)
assert(buyerBuild.ok, 'buyer signup build accepts email-required progressive payload')
if (buyerBuild.ok) {
  assert(
    /^buyer-signups\/2026-02-03\/buyer-2026-02-03T04-05-06-007Z-[a-f0-9]{16}\.json$/.test(
      buyerBuild.submission.s3Key,
    ),
    'buyer signup S3 key uses required date/timestamp/email-hash pattern',
  )
  assert(!buyerBuild.submission.s3Key.includes(safePhone.slice(-4)), 'buyer signup S3 key does not depend on phone')
  assert(
    buyerBuild.submission.sideEffectExpectations.ghlTags.includes('buyer-list') &&
      buyerBuild.submission.sideEffectExpectations.ghlTags.includes('deals-website'),
    'buyer signup GHL tags include buyer-list and deals-website',
  )
  assert(buyerBuild.submission.sideEffectExpectations.smsEligible === true, 'buyer SMS eligibility requires phone plus consent')
}

const buyerNoConsent = pipeline.buildBuyerSignupSubmission({ email: safeEmail, phone: safePhone }, metadata, fixedNow)
assert(
  !buyerNoConsent.ok && buyerNoConsent.errors.some((error) => error.field === 'serviceConsent'),
  'buyer signup rejects phone submissions without explicit service SMS consent',
)

const dealBuild = pipeline.buildDealInterestSubmission(
  {
    dealSlug: 'sample-deal',
    email: safeEmail,
    phone: safePhone,
    serviceConsent: 'true',
    message: 'Please send diligence materials.',
  },
  metadata,
  fixedNow,
)
assert(dealBuild.ok, 'deal interest build accepts required deal slug and email')
if (dealBuild.ok) {
  assert(
    /^deal-interest\/2026-02-03\/sample-deal-2026-02-03T04-05-06-007Z-[a-f0-9]{16}\.json$/.test(
      dealBuild.submission.s3Key,
    ),
    'deal interest S3 key uses required slug/date/timestamp/email-hash pattern',
  )
  assert(
    dealBuild.submission.sideEffectExpectations.ghlTags.includes('interested-sample-deal'),
    'deal interest GHL tag includes interested-{dealSlug}',
  )
  assert(
    dealBuild.submission.sideEffectExpectations.ghlNote.includes('sample-deal') &&
      dealBuild.submission.sideEffectExpectations.ghlNote.includes(fixedNow.toISOString()),
    'deal interest GHL note mentions slug and timestamp',
  )
  assert(
    !dealBuild.submission.sideEffectExpectations.ghlNote.includes('REDACTED_EXACT_ADDRESS'),
    'deal interest GHL note does not include exact address placeholder',
  )
  const redactedSummary = dealBuild.submission.sideEffectExpectations.redactedAlertSummary
  assert(
    Boolean(redactedSummary) &&
      !redactedSummary.includes(safeEmail) &&
      !redactedSummary.includes(safePhone) &&
      redactedSummary.includes(dealBuild.submission.emailHash),
    'deal interest Slack summary is redacted and uses email hash only',
  )
}

const dealNoConsent = pipeline.buildDealInterestSubmission(
  { dealSlug: 'sample-deal', email: safeEmail, phone: safePhone },
  metadata,
  fixedNow,
)
assert(
  !dealNoConsent.ok && dealNoConsent.errors.some((error) => error.field === 'serviceConsent'),
  'deal interest rejects phone submissions without explicit service SMS consent',
)

const sellerBuild = pipeline.buildSellerLeadSubmission(
  {
    fullName: '[REDACTED_NAME]',
    address: ['REDACTED', 'PROPERTY', 'PLACEHOLDER'].join(' '),
    email: safeSellerEmail,
    phone: safePhone,
    serviceConsent: 'true',
  },
  metadata,
  fixedNow,
)
assert(sellerBuild.ok, 'seller lead build accepts seller capture payload with optional phone provided')
if (sellerBuild.ok) {
  assert(
    /^seller-leads\/2026-02-03\/seller-2026-02-03T04-05-06-007Z-[a-f0-9]{16}\.json$/.test(
      sellerBuild.submission.s3Key,
    ),
    'seller lead S3 key is hash-based and avoids raw contact values',
  )
  assert(
    sellerBuild.submission.sideEffectExpectations.ghlTags.includes('website-lead') &&
      sellerBuild.submission.sideEffectExpectations.ghlTags.includes('cash-offer-request'),
    'seller lead keeps GHL best-effort tag semantics',
  )
}

const sellerNoPhoneBuild = pipeline.buildSellerLeadSubmission(
  {
    fullName: '[REDACTED_NAME]',
    address: ['REDACTED', 'PROPERTY', 'PLACEHOLDER'].join(' '),
    email: safeSellerEmail,
  },
  metadata,
  fixedNow,
)
assert(sellerNoPhoneBuild.ok, 'seller lead build accepts missing optional phone')
assert(
  sellerNoPhoneBuild.ok && sellerNoPhoneBuild.submission.sideEffectExpectations.smsEligible === false,
  'seller lead does not enable SMS behavior without phone plus consent',
)

const sellerNoConsent = pipeline.buildSellerLeadSubmission(
  {
    fullName: '[REDACTED_NAME]',
    address: ['REDACTED', 'PROPERTY', 'PLACEHOLDER'].join(' '),
    email: safeSellerEmail,
    phone: safePhone,
  },
  metadata,
  fixedNow,
)
assert(
  !sellerNoConsent.ok && sellerNoConsent.errors.some((error) => error.field === 'serviceConsent'),
  'seller lead rejects phone submissions without explicit service SMS consent',
)

if (buyerBuild.ok) {
  const events = []
  const sideEffects = [
    {
      name: 'ghl',
      run: async () => {
        events.push('effect:ghl')
        return { name: 'ghl', status: 'mocked', mocked: true, details: { verifier: true } }
      },
    },
    {
      name: 'payload-mirror',
      run: async () => {
        events.push('effect:payload-mirror')
        return { name: 'payload-mirror', status: 'mocked', mocked: true, details: { verifier: true } }
      },
    },
  ]
  await pipeline.submitS3FirstForm(
    { ...buyerBuild.submission, idempotencyKey: 'verify-ordering', sideEffects },
    {
      requestId: 'verify-ordering-request',
      idempotencyStore: new Map(),
      now: fixedNow,
      eventRecorder: (event) => events.push(`${event.stage}:${event.name}:${event.action}`),
      s3Writer: async (request) => {
        events.push('writer:s3')
        return { bucket: request.bucket, key: request.key, mocked: true, etag: 'mock-etag' }
      },
    },
  )
  assert(
    events.indexOf('s3:s3:success') > -1 && events.indexOf('s3:s3:success') < events.indexOf('side-effect:ghl:attempt'),
    'runtime ordering records S3 success before GHL side effect attempt',
  )
  assert(
    events.indexOf('side-effect:ghl:attempt') < events.indexOf('side-effect:payload-mirror:attempt'),
    'runtime ordering preserves deterministic side-effect sequence after S3',
  )
}

if (dealBuild.ok) {
  let sideEffectCalls = 0
  const failureEvents = []
  try {
    await pipeline.submitS3FirstForm(
      {
        ...dealBuild.submission,
        idempotencyKey: 'verify-s3-failure',
        sideEffects: [
          {
            name: 'slack-alert',
            run: async () => {
              sideEffectCalls += 1
              return { name: 'slack-alert', status: 'mocked', mocked: true }
            },
          },
        ],
      },
      {
        requestId: 'verify-s3-failure-request',
        idempotencyStore: new Map(),
        now: fixedNow,
        eventRecorder: (event) => failureEvents.push(`${event.stage}:${event.name}:${event.action}`),
        s3Writer: async () => {
          throw new Error('expected verifier S3 failure')
        },
      },
    )
  } catch (error) {
    assert(error?.code === 's3_persistence_failed', 'S3 failure surfaces a safe persistence error code')
  }
  assert(sideEffectCalls === 0, 'side effects are skipped when S3 persistence fails')
  assert(!failureEvents.some((event) => event.startsWith('side-effect:')), 'S3 failure emits no side-effect events')
}

if (buyerBuild.ok) {
  let s3Calls = 0
  const store = new Map()
  const submission = { ...buyerBuild.submission, idempotencyKey: 'verify-dedupe' }
  await pipeline.submitS3FirstForm(submission, {
    requestId: 'verify-dedupe-one',
    idempotencyStore: store,
    now: fixedNow,
    s3Writer: async (request) => {
      s3Calls += 1
      return { bucket: request.bucket, key: request.key, mocked: true }
    },
  })
  const duplicate = await pipeline.submitS3FirstForm(submission, {
    requestId: 'verify-dedupe-two',
    idempotencyStore: store,
    now: new Date(fixedNow.getTime() + 1000),
    s3Writer: async (request) => {
      s3Calls += 1
      return { bucket: request.bucket, key: request.key, mocked: true }
    },
  })
  assert(duplicate.duplicate === true && s3Calls === 1, 'idempotency dedupes repeated form/email submissions inside the window')
}

const rateStore = new Map()
const rateOne = pipeline.checkFormRateLimit({
  formType: 'buyer-signup',
  emailHash: 'verify-email-hash',
  ipHash: 'verify-ip-hash',
  now: fixedNow,
  store: rateStore,
  emailLimit: 2,
  ipLimit: 10,
})
const rateTwo = pipeline.checkFormRateLimit({
  formType: 'buyer-signup',
  emailHash: 'verify-email-hash',
  ipHash: 'verify-ip-hash',
  now: fixedNow,
  store: rateStore,
  emailLimit: 2,
  ipLimit: 10,
})
const rateThree = pipeline.checkFormRateLimit({
  formType: 'buyer-signup',
  emailHash: 'verify-email-hash',
  ipHash: 'verify-ip-hash',
  now: fixedNow,
  store: rateStore,
  emailLimit: 2,
  ipLimit: 10,
})
assert(rateOne.allowed && rateTwo.allowed && !rateThree.allowed && rateThree.reason === 'email', 'per-email rate limiting blocks after configured window count')

const piiAndSecretFilesToScan = [
  'scripts/verify-s3-first-form-pipeline.mjs',
  'src/lib/forms/s3FirstFormPipeline.ts',
  'src/lib/forms/routeHandlers.ts',
  'src/app/api/seller-leads/route.ts',
  'src/app/api/buyer-signups/route.ts',
  'src/app/api/deal-interest/route.ts',
  'src/components/seller/SellerLeadForm.tsx',
  'src/components/buyer/BuyerSignupForm.tsx',
  'src/components/buyer/BuyerListSignupForm.tsx',
  'src/components/buyer/DealInterestForm.tsx',
]
const piiAndSecretPatterns = [
  { label: 'raw email address', pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { label: 'North American phone number', pattern: /\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/ },
  { label: 'Slack webhook URL', pattern: /hooks\.slack\.com/i },
  { label: 'AWS access key id', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: 'private key marker', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  {
    label: 'assignment-style secret/token/api key',
    pattern: /(?<!REDACTED_)(?:secret|token|api[_-]?key|password)\s*[:=]\s*['"][^'"]+['"]/i,
  },
]
for (const file of piiAndSecretFilesToScan) {
  const source = read(file)
  for (const { label, pattern } of piiAndSecretPatterns) {
    assert(!pattern.test(source), `${file} contains no ${label}`)
  }
}

if (failures.length > 0) {
  console.error('S3-first form pipeline verification failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  exit(1)
}

console.log('S3-first form pipeline verification passed')
for (const message of passes) {
  console.log(`- ${message}`)
}

async function importPipelineModule() {
  const tempDir = mkdtempSync(join(tmpdir(), 'gcoffers-form-pipeline-'))
  const tempModulePath = join(tempDir, 's3FirstFormPipeline.mjs')
  try {
    const transpiled = ts.transpileModule(pipelineSource, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        esModuleInterop: true,
      },
    })
    writeFileSync(tempModulePath, transpiled.outputText)
    return await import(pathToFileURL(tempModulePath).href)
  } finally {
    setTimeout(() => rmSync(tempDir, { recursive: true, force: true }), 1000)
  }
}

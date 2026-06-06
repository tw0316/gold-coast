import { createHash, randomUUID } from 'node:crypto'

export const MAX_FORM_BODY_BYTES = 24 * 1024
export const HONEYPOT_FIELD_NAME = 'website'
export const FORM_IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000
export const FORM_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
export const FORM_IP_RATE_LIMIT = 30
export const FORM_EMAIL_RATE_LIMIT = 5
export const DEFAULT_LEADS_BUCKET = 'goldcoast-leads'
export const FORM_PIPELINE_SCHEMA_VERSION = 'slice-6.s3-first.v1'

export type FormType = 'seller-lead' | 'buyer-signup' | 'deal-interest'
export type SideEffectName = 'ghl' | 'payload-mirror' | 'slack-alert' | 'email-alert'
export type SideEffectStatus = 'mocked' | 'skipped' | 'failed'

export type SafeMetadataValue =
  | string
  | number
  | boolean
  | null
  | SafeMetadataValue[]
  | { [key: string]: SafeMetadataValue }

export type ParsedFormBody = Record<string, unknown>

export type ClientMetadata = {
  ipHash: string
  userAgent: string | null
}

export type ValidationError = {
  field: string
  code: string
  message: string
}

export type BuildSubmissionResult =
  | { ok: true; submission: BuiltFormSubmission }
  | { ok: false; errors: ValidationError[] }

export type SideEffectResult = {
  name: SideEffectName
  status: SideEffectStatus
  mocked: boolean
  details?: Record<string, SafeMetadataValue>
}

export type SideEffectContext = {
  formType: FormType
  requestId: string
  s3Key: string
  s3Bucket: string
  submittedAt: string
  emailHash: string
  dealSlug?: string
  record: Record<string, unknown>
}

export type SideEffectDefinition = {
  name: SideEffectName
  run: (context: SideEffectContext) => Promise<SideEffectResult>
}

export type SideEffectExpectations = {
  ghlTags: string[]
  ghlNote?: string
  redactedAlertSummary?: string
  smsEligible: boolean
  emailFullDetailsRequiresProductionConfig?: boolean
}

export type BuiltFormSubmission = {
  formType: FormType
  idempotencyKey: string
  emailHash: string
  submittedAt: string
  s3Bucket: string
  s3Key: string
  s3Record: Record<string, unknown>
  sideEffects: SideEffectDefinition[]
  sideEffectExpectations: SideEffectExpectations
}

export type S3WriteRequest = {
  bucket: string
  key: string
  body: string
  contentType: 'application/json'
  serverSideEncryption: 'AES256'
  formType: FormType
  requestId: string
}

export type S3WriteResult = {
  bucket: string
  key: string
  mocked: boolean
  etag?: string
}

export type S3Writer = (request: S3WriteRequest) => Promise<S3WriteResult>

export type PipelineEvent = {
  stage: 'idempotency' | 's3' | 'side-effect'
  name: string
  action: 'attempt' | 'success' | 'failure' | 'skip'
}

export type S3FirstSubmissionResult = {
  success: true
  formType: FormType
  duplicate: boolean
  requestId: string
  s3Key: string
  s3Bucket: string
  s3Mocked: boolean
  sideEffects: SideEffectResult[]
}

export type IdempotencyEntry = {
  expiresAt: number
  result: S3FirstSubmissionResult
}

export type RateLimitEntry = {
  resetAt: number
  count: number
}

export type RateLimitDecision = {
  allowed: boolean
  reason?: 'ip' | 'email'
  retryAfterSeconds?: number
}

export class FormPipelineError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.name = 'FormPipelineError'
    this.code = code
    this.status = status
  }
}

export class RequestBodyTooLargeError extends FormPipelineError {
  constructor() {
    super('request_body_too_large', 'Request body exceeds the public form size limit.', 413)
    this.name = 'RequestBodyTooLargeError'
  }
}

export class S3PersistenceError extends FormPipelineError {
  constructor() {
    super('s3_persistence_failed', 'The source-of-truth S3 write failed before side effects could run.', 503)
    this.name = 'S3PersistenceError'
  }
}

const globalStores = globalThis as typeof globalThis & {
  __gcoffersFormIdempotencyStore?: Map<string, IdempotencyEntry>
  __gcoffersFormRateLimitStore?: Map<string, RateLimitEntry>
}

const getDefaultIdempotencyStore = () => {
  globalStores.__gcoffersFormIdempotencyStore ??= new Map<string, IdempotencyEntry>()
  return globalStores.__gcoffersFormIdempotencyStore
}

const getDefaultRateLimitStore = () => {
  globalStores.__gcoffersFormRateLimitStore ??= new Map<string, RateLimitEntry>()
  return globalStores.__gcoffersFormRateLimitStore
}

export function createRequestId() {
  return `form-${randomUUID()}`
}

export function hashIdentifier(value: string) {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex').slice(0, 16)
}

export function getLeadsBucket() {
  return process.env.FORM_PIPELINE_S3_BUCKET || process.env.LEADS_BUCKET || DEFAULT_LEADS_BUCKET
}

export function getClientMetadata(request: Request): ClientMetadata {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = request.headers.get('x-real-ip')?.trim()
  const ipForHashing = forwardedFor || realIp || 'unknown-ip'

  return {
    ipHash: hashIdentifier(ipForHashing),
    userAgent: trimAndLimit(request.headers.get('user-agent'), 512) || null,
  }
}

export async function parseLimitedRequestBody(
  request: Request,
  maxBytes = MAX_FORM_BODY_BYTES,
): Promise<ParsedFormBody> {
  const contentLength = request.headers.get('content-length')
  const contentLengthBytes = contentLength ? Number(contentLength) : 0

  if (Number.isFinite(contentLengthBytes) && contentLengthBytes > maxBytes) {
    throw new RequestBodyTooLargeError()
  }

  const bodyText = await request.text()
  if (Buffer.byteLength(bodyText, 'utf8') > maxBytes) {
    throw new RequestBodyTooLargeError()
  }

  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    if (bodyText.trim() === '') {
      return {}
    }

    try {
      const parsed = JSON.parse(bodyText) as unknown
      if (!isPlainObject(parsed)) {
        throw new FormPipelineError('invalid_request_body', 'Public form body must be an object.', 400)
      }
      return parsed as ParsedFormBody
    } catch (error) {
      if (error instanceof FormPipelineError) {
        throw error
      }
      throw new FormPipelineError('invalid_json', 'Public form JSON could not be parsed.', 400)
    }
  }

  const params = new URLSearchParams(bodyText)
  const parsed: ParsedFormBody = {}
  for (const [key, value] of params.entries()) {
    const existing = parsed[key]
    if (Array.isArray(existing)) {
      existing.push(value)
    } else if (typeof existing === 'string') {
      parsed[key] = [existing, value]
    } else {
      parsed[key] = value
    }
  }

  return parsed
}

export function hasHoneypotValue(body: ParsedFormBody) {
  return getStringField(body, HONEYPOT_FIELD_NAME).length > 0
}

export function checkFormRateLimit({
  formType,
  emailHash,
  ipHash,
  now = new Date(),
  store = getDefaultRateLimitStore(),
  ipLimit = FORM_IP_RATE_LIMIT,
  emailLimit = FORM_EMAIL_RATE_LIMIT,
  windowMs = FORM_RATE_LIMIT_WINDOW_MS,
}: {
  formType: FormType
  emailHash: string
  ipHash: string
  now?: Date
  store?: Map<string, RateLimitEntry>
  ipLimit?: number
  emailLimit?: number
  windowMs?: number
}): RateLimitDecision {
  const nowMs = now.getTime()
  const ipDecision = incrementRateLimitBucket({
    key: `${formType}:ip:${ipHash}`,
    limit: ipLimit,
    nowMs,
    store,
    windowMs,
  })

  if (!ipDecision.allowed) {
    return { ...ipDecision, reason: 'ip' }
  }

  const emailDecision = incrementRateLimitBucket({
    key: `${formType}:email:${emailHash}`,
    limit: emailLimit,
    nowMs,
    store,
    windowMs,
  })

  if (!emailDecision.allowed) {
    return { ...emailDecision, reason: 'email' }
  }

  return { allowed: true }
}

export function buildSellerLeadSubmission(
  body: ParsedFormBody,
  metadata: ClientMetadata,
  now = new Date(),
): BuildSubmissionResult {
  const errors: ValidationError[] = []
  const submittedAt = now.toISOString()
  const fullName = trimAndLimit(getStringField(body, 'fullName'), 160)
  const address = trimAndLimit(getStringField(body, 'address'), 300)
  const email = normalizeEmail(getStringField(body, 'email'))
  const phone = normalizePhone(getStringField(body, 'phone'))

  if (fullName.length < 2) {
    errors.push(requiredError('fullName', 'Full name is required.'))
  }
  if (address.length < 5) {
    errors.push(requiredError('address', 'Property address is required.'))
  }
  if (!email) {
    errors.push(requiredError('email', 'Valid email is required.'))
  }
  if (!phone) {
    errors.push(requiredError('phone', 'Valid phone is required.'))
  }

  if (errors.length > 0 || !email || !phone) {
    return { ok: false, errors }
  }

  const emailHash = hashIdentifier(email)
  const { datePrefix, keyTimestamp } = getS3KeyParts(now)
  const s3Key = `seller-leads/${datePrefix}/seller-${keyTimestamp}-${emailHash}.json`
  const serviceConsent = getBooleanField(body, 'serviceConsent')
  const marketingConsent = getBooleanField(body, 'marketingConsent')
  const record = {
    formType: 'seller-lead',
    schemaVersion: FORM_PIPELINE_SCHEMA_VERSION,
    submittedAt,
    fullName,
    address,
    phone,
    email,
    emailHash,
    condition: nullableText(body, 'condition', 120),
    timeline: nullableText(body, 'timeline', 120),
    serviceConsent,
    marketingConsent,
    tcpaConsent: getBooleanField(body, 'tcpaConsent') || serviceConsent,
    tcpaTimestamp: serviceConsent || marketingConsent ? submittedAt : null,
    source: trimAndLimit(getStringField(body, 'source') || 'seller-site', 80),
    page: trimAndLimit(getStringField(body, 'page') || '/', 300),
    referrer: nullableText(body, 'referrer', 500),
    userAgent: nullableText(body, 'userAgent', 512) || metadata.userAgent,
    ipHash: metadata.ipHash,
  }

  const sideEffects = [
    createGhlMockEffect({
      tags: ['website-lead', 'cash-offer-request'],
      source: 'Website - gcoffers.com',
      smsEligible: Boolean(phone && serviceConsent),
    }),
  ]

  return {
    ok: true,
    submission: {
      formType: 'seller-lead',
      idempotencyKey: buildIdempotencyKey('seller-lead', emailHash),
      emailHash,
      submittedAt,
      s3Bucket: getLeadsBucket(),
      s3Key,
      s3Record: record,
      sideEffects,
      sideEffectExpectations: {
        ghlTags: ['website-lead', 'cash-offer-request'],
        smsEligible: Boolean(phone && serviceConsent),
      },
    },
  }
}

export function buildBuyerSignupSubmission(
  body: ParsedFormBody,
  metadata: ClientMetadata,
  now = new Date(),
): BuildSubmissionResult {
  const errors: ValidationError[] = []
  const submittedAt = now.toISOString()
  const email = normalizeEmail(getStringField(body, 'email'))
  const phoneRaw = getStringField(body, 'phone')
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null

  if (!email) {
    errors.push(requiredError('email', 'Valid email is required.'))
  }
  if (phoneRaw && !phone) {
    errors.push(requiredError('phone', 'Phone must be valid when provided.'))
  }

  if (errors.length > 0 || !email) {
    return { ok: false, errors }
  }

  const emailHash = hashIdentifier(email)
  const { datePrefix, keyTimestamp } = getS3KeyParts(now)
  const s3Key = `buyer-signups/${datePrefix}/buyer-${keyTimestamp}-${emailHash}.json`
  const serviceConsent = getBooleanField(body, 'serviceConsent')
  const marketingConsent = getBooleanField(body, 'marketingConsent')
  const smsConsent = Boolean(phone && serviceConsent)
  const record = {
    formType: 'buyer-signup',
    schemaVersion: FORM_PIPELINE_SCHEMA_VERSION,
    submittedAt,
    fullName: nullableText(body, 'fullName', 160),
    email,
    emailHash,
    phone,
    buyerType: nullableText(body, 'buyerType', 80),
    areas: getStringArrayField(body, 'areas', 20, 80),
    propertyTypes: getStringArrayField(body, 'propertyTypes', 20, 80),
    priceRange: nullableText(body, 'priceRange', 80),
    purchaseMethod: nullableText(body, 'purchaseMethod', 80),
    source: trimAndLimit(getStringField(body, 'source') || 'deals-website', 80),
    serviceConsent,
    marketingConsent,
    smsConsent,
    consentTimestamp: smsConsent || marketingConsent ? submittedAt : null,
    ipHash: metadata.ipHash,
    userAgent: metadata.userAgent,
  }
  const ghlTags = ['buyer-list', 'deals-website']
  const sideEffects = [
    createGhlMockEffect({
      tags: ghlTags,
      source: 'Deals Website - deals.gcoffers.com',
      smsEligible: smsConsent,
    }),
    createPayloadMirrorMockEffect({ collection: 'buyer-signups' }),
  ]

  return {
    ok: true,
    submission: {
      formType: 'buyer-signup',
      idempotencyKey: buildIdempotencyKey('buyer-signup', emailHash),
      emailHash,
      submittedAt,
      s3Bucket: getLeadsBucket(),
      s3Key,
      s3Record: record,
      sideEffects,
      sideEffectExpectations: {
        ghlTags,
        smsEligible: smsConsent,
      },
    },
  }
}

export function buildDealInterestSubmission(
  body: ParsedFormBody,
  metadata: ClientMetadata,
  now = new Date(),
): BuildSubmissionResult {
  const errors: ValidationError[] = []
  const submittedAt = now.toISOString()
  const email = normalizeEmail(getStringField(body, 'email'))
  const dealSlug = sanitizeDealSlug(getStringField(body, 'dealSlug'))
  const phoneRaw = getStringField(body, 'phone')
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null

  if (!dealSlug) {
    errors.push(requiredError('dealSlug', 'Deal slug is required.'))
  }
  if (!email) {
    errors.push(requiredError('email', 'Valid email is required.'))
  }
  if (phoneRaw && !phone) {
    errors.push(requiredError('phone', 'Phone must be valid when provided.'))
  }

  if (errors.length > 0 || !email || !dealSlug) {
    return { ok: false, errors }
  }

  const emailHash = hashIdentifier(email)
  const { datePrefix, keyTimestamp } = getS3KeyParts(now)
  const s3Key = `deal-interest/${datePrefix}/${dealSlug}-${keyTimestamp}-${emailHash}.json`
  const serviceConsent = getBooleanField(body, 'serviceConsent')
  const smsConsent = Boolean(phone && serviceConsent)
  const ghlTag = `interested-${dealSlug}`
  const ghlNote = `Interest in deal ${dealSlug} submitted at ${submittedAt}. Exact address omitted from the CRM note.`
  const redactedAlertSummary = [
    `Deal interest for ${dealSlug}`,
    `submittedAt=${submittedAt}`,
    `emailHash=${emailHash}`,
    `phoneProvided=${Boolean(phone)}`,
    'exactAddress=omitted',
  ].join('; ')

  const record = {
    formType: 'deal-interest',
    schemaVersion: FORM_PIPELINE_SCHEMA_VERSION,
    submittedAt,
    dealSlug,
    fullName: nullableText(body, 'fullName', 160),
    email,
    emailHash,
    phone,
    serviceConsent,
    smsConsent,
    message: nullableText(body, 'message', 1000),
    source: trimAndLimit(getStringField(body, 'source') || 'deals-website', 80),
    ghlNote,
    redactedAlertSummary,
    ipHash: metadata.ipHash,
    userAgent: metadata.userAgent,
  }

  const sideEffects = [
    createGhlMockEffect({
      tags: [ghlTag],
      source: 'Deals Website - deal interest',
      note: ghlNote,
      smsEligible: smsConsent,
    }),
    createPayloadMirrorMockEffect({ collection: 'deal-interest' }),
    createSlackAlertMockEffect({ redactedAlertSummary }),
    createEmailAlertMockEffect(),
  ]

  return {
    ok: true,
    submission: {
      formType: 'deal-interest',
      idempotencyKey: buildIdempotencyKey('deal-interest', emailHash, dealSlug),
      emailHash,
      submittedAt,
      s3Bucket: getLeadsBucket(),
      s3Key,
      s3Record: record,
      sideEffects,
      sideEffectExpectations: {
        ghlTags: [ghlTag],
        ghlNote,
        redactedAlertSummary,
        smsEligible: smsConsent,
        emailFullDetailsRequiresProductionConfig: true,
      },
    },
  }
}

export function createMockS3Writer({ fail = false }: { fail?: boolean } = {}): S3Writer {
  return async (request: S3WriteRequest) => {
    if (fail) {
      throw new Error('mock_s3_failure')
    }

    return {
      bucket: request.bucket,
      key: request.key,
      mocked: true,
      etag: `mock-${hashIdentifier(request.key)}`,
    }
  }
}

export function createAwsS3Writer({ region = process.env.AWS_REGION || 'us-east-1' }: { region?: string } = {}): S3Writer {
  let clientPromise: Promise<unknown> | null = null

  return async (request: S3WriteRequest) => {
    const { PutObjectCommand, S3Client } = await import('@aws-sdk/client-s3')
    clientPromise ??= Promise.resolve(new S3Client({ region }))
    const client = (await clientPromise) as InstanceType<typeof S3Client>
    const result = await client.send(
      new PutObjectCommand({
        Bucket: request.bucket,
        Key: request.key,
        Body: request.body,
        ContentType: request.contentType,
        ServerSideEncryption: request.serverSideEncryption,
      }),
    )

    return {
      bucket: request.bucket,
      key: request.key,
      mocked: false,
      etag: result.ETag,
    }
  }
}

export function createConfiguredS3Writer({ failMock = false }: { failMock?: boolean } = {}): S3Writer {
  const mode = process.env.FORM_PIPELINE_S3_WRITER || process.env.FORM_PIPELINE_S3_MODE || 'mock'
  if (mode === 'aws') {
    const configuredBucket = process.env.FORM_PIPELINE_S3_BUCKET || process.env.LEADS_BUCKET
    if (!configuredBucket) {
      return async () => {
        throw new Error('s3_bucket_not_configured')
      }
    }

    return createAwsS3Writer()
  }

  return createMockS3Writer({ fail: failMock })
}

export async function submitS3FirstForm(
  submission: BuiltFormSubmission,
  {
    requestId = createRequestId(),
    s3Writer = createMockS3Writer(),
    idempotencyStore = getDefaultIdempotencyStore(),
    idempotencyWindowMs = FORM_IDEMPOTENCY_WINDOW_MS,
    now = new Date(),
    eventRecorder,
  }: {
    requestId?: string
    s3Writer?: S3Writer
    idempotencyStore?: Map<string, IdempotencyEntry>
    idempotencyWindowMs?: number
    now?: Date
    eventRecorder?: (event: PipelineEvent) => void
  } = {},
): Promise<S3FirstSubmissionResult> {
  purgeExpiredIdempotencyEntries(idempotencyStore, now.getTime())
  const existing = idempotencyStore.get(submission.idempotencyKey)
  if (existing && existing.expiresAt > now.getTime()) {
    eventRecorder?.({ stage: 'idempotency', name: submission.formType, action: 'skip' })
    return {
      ...existing.result,
      duplicate: true,
      requestId,
      sideEffects: existing.result.sideEffects.map((effect) => ({
        ...effect,
        status: 'skipped',
        details: {
          ...(effect.details ?? {}),
          dedupeWindowSeconds: Math.round(idempotencyWindowMs / 1000),
        },
      })),
    }
  }

  const s3Body = JSON.stringify(submission.s3Record, null, 2)
  let s3Result: S3WriteResult

  eventRecorder?.({ stage: 's3', name: 's3', action: 'attempt' })
  try {
    s3Result = await s3Writer({
      bucket: submission.s3Bucket,
      key: submission.s3Key,
      body: s3Body,
      contentType: 'application/json',
      serverSideEncryption: 'AES256',
      formType: submission.formType,
      requestId,
    })
    eventRecorder?.({ stage: 's3', name: 's3', action: 'success' })
  } catch {
    eventRecorder?.({ stage: 's3', name: 's3', action: 'failure' })
    throw new S3PersistenceError()
  }

  const sideEffects: SideEffectResult[] = []
  const context: SideEffectContext = {
    formType: submission.formType,
    requestId,
    s3Key: submission.s3Key,
    s3Bucket: submission.s3Bucket,
    submittedAt: submission.submittedAt,
    emailHash: submission.emailHash,
    dealSlug: getDealSlugFromRecord(submission.s3Record),
    record: submission.s3Record,
  }

  for (const sideEffect of submission.sideEffects) {
    eventRecorder?.({ stage: 'side-effect', name: sideEffect.name, action: 'attempt' })
    try {
      const result = await sideEffect.run(context)
      sideEffects.push(result)
      eventRecorder?.({ stage: 'side-effect', name: sideEffect.name, action: 'success' })
    } catch {
      sideEffects.push({
        name: sideEffect.name,
        status: 'failed',
        mocked: true,
        details: { errorCode: 'mock_side_effect_failed' },
      })
      eventRecorder?.({ stage: 'side-effect', name: sideEffect.name, action: 'failure' })
    }
  }

  const result: S3FirstSubmissionResult = {
    success: true,
    formType: submission.formType,
    duplicate: false,
    requestId,
    s3Key: s3Result.key,
    s3Bucket: s3Result.bucket,
    s3Mocked: s3Result.mocked,
    sideEffects,
  }

  idempotencyStore.set(submission.idempotencyKey, {
    expiresAt: now.getTime() + idempotencyWindowMs,
    result,
  })

  return result
}

function createGhlMockEffect({
  tags,
  source,
  note,
  smsEligible,
}: {
  tags: string[]
  source: string
  note?: string
  smsEligible: boolean
}): SideEffectDefinition {
  return {
    name: 'ghl',
    run: async () => ({
      name: 'ghl',
      status: 'mocked',
      mocked: true,
      details: {
        source,
        tags,
        noteIncluded: Boolean(note),
        smsEligible,
      },
    }),
  }
}

function createPayloadMirrorMockEffect({ collection }: { collection: string }): SideEffectDefinition {
  return {
    name: 'payload-mirror',
    run: async (context) => ({
      name: 'payload-mirror',
      status: 'mocked',
      mocked: true,
      details: {
        collection,
        s3ObjectKey: context.s3Key,
        s3FirstStatus: 's3_persisted',
      },
    }),
  }
}

function createSlackAlertMockEffect({ redactedAlertSummary }: { redactedAlertSummary: string }): SideEffectDefinition {
  return {
    name: 'slack-alert',
    run: async () => ({
      name: 'slack-alert',
      status: 'mocked',
      mocked: true,
      details: {
        redacted: true,
        summary: redactedAlertSummary,
      },
    }),
  }
}

function createEmailAlertMockEffect(): SideEffectDefinition {
  return {
    name: 'email-alert',
    run: async () => {
      const productionConfigEnabled = process.env.FORM_PIPELINE_INTERNAL_EMAIL_APPROVED === 'true'
      return {
        name: 'email-alert',
        status: productionConfigEnabled ? 'mocked' : 'skipped',
        mocked: true,
        details: {
          fullDetailsRequireProductionConfig: true,
          localLiveSend: false,
          productionConfigEnabled,
        },
      }
    },
  }
}

function buildIdempotencyKey(formType: FormType, emailHash: string, dealSlug?: string) {
  return [formType, emailHash, dealSlug].filter(Boolean).join(':')
}

function getS3KeyParts(now: Date) {
  const iso = now.toISOString()
  return {
    datePrefix: iso.slice(0, 10),
    keyTimestamp: iso.replace(/[:.]/g, '-'),
  }
}

function getDealSlugFromRecord(record: Record<string, unknown>) {
  const dealSlug = record.dealSlug
  return typeof dealSlug === 'string' ? dealSlug : undefined
}

function incrementRateLimitBucket({
  key,
  limit,
  nowMs,
  store,
  windowMs,
}: {
  key: string
  limit: number
  nowMs: number
  store: Map<string, RateLimitEntry>
  windowMs: number
}): RateLimitDecision {
  const existing = store.get(key)
  if (!existing || existing.resetAt <= nowMs) {
    store.set(key, { count: 1, resetAt: nowMs + windowMs })
    return { allowed: true }
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - nowMs) / 1000)),
    }
  }

  existing.count += 1
  return { allowed: true }
}

function purgeExpiredIdempotencyEntries(store: Map<string, IdempotencyEntry>, nowMs: number) {
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= nowMs) {
      store.delete(key)
    }
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredError(field: string, message: string): ValidationError {
  return { field, code: 'required_or_invalid', message }
}

function getStringField(body: ParsedFormBody, field: string) {
  const value = body[field]
  if (Array.isArray(value)) {
    return String(value[0] ?? '').trim()
  }
  if (typeof value === 'string') {
    return value.trim()
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim()
  }
  return ''
}

function getStringArrayField(body: ParsedFormBody, field: string, maxItems: number, maxLength: number) {
  const value = body[field]
  const values = Array.isArray(value) ? value : value ? [value] : []
  return values
    .map((item) => trimAndLimit(String(item ?? ''), maxLength))
    .filter(Boolean)
    .slice(0, maxItems)
}

function getBooleanField(body: ParsedFormBody, field: string) {
  const value = body[field]
  if (typeof value === 'boolean') {
    return value
  }
  if (Array.isArray(value)) {
    return value.some((item) => booleanFromString(String(item)))
  }
  return booleanFromString(String(value ?? ''))
}

function booleanFromString(value: string) {
  const normalized = value.trim().toLowerCase()
  return ['1', 'true', 'yes', 'on'].includes(normalized)
}

function nullableText(body: ParsedFormBody, field: string, maxLength: number) {
  return trimAndLimit(getStringField(body, field), maxLength) || null
}

function trimAndLimit(value: string | null | undefined, maxLength: number) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function normalizeEmail(value: string) {
  const email = trimAndLimit(value, 254).toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1)
  }
  if (digits.length === 10) {
    return digits
  }
  return null
}

function sanitizeDealSlug(value: string) {
  return trimAndLimit(value, 140)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

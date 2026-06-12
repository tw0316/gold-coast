import { NextResponse } from 'next/server'

import {
  FormPipelineError,
  RequestBodyTooLargeError,
  S3PersistenceError,
  buildBuyerSignupSubmission,
  buildDealInterestSubmission,
  buildSellerLeadSubmission,
  checkFormRateLimit,
  createConfiguredS3Writer,
  createRequestId,
  getClientMetadata,
  hasHoneypotValue,
  parseLimitedRequestBody,
  submitS3FirstForm,
  type BuildSubmissionResult,
  type FormType,
  type S3FirstSubmissionResult,
} from './s3FirstFormPipeline'

const jsonHeaders = {
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function formPipelineOptionsResponse() {
  return new NextResponse(null, {
    status: 204,
    headers: jsonHeaders,
  })
}

export function handleSellerLeadRoute(request: Request) {
  return handleFormPipelineRoute(request, 'seller-lead')
}

export function handleBuyerSignupRoute(request: Request) {
  return handleFormPipelineRoute(request, 'buyer-signup')
}

export function handleDealInterestRoute(request: Request) {
  return handleFormPipelineRoute(request, 'deal-interest')
}

async function handleFormPipelineRoute(request: Request, formType: FormType) {
  const requestId = createRequestId()
  const now = new Date()
  const metadata = getClientMetadata(request)

  try {
    const body = await parseLimitedRequestBody(request)

    if (hasHoneypotValue(body)) {
      return NextResponse.json(
        {
          success: true,
          accepted: false,
          filtered: true,
          formType,
          requestId,
          reason: 'spam_trap',
        },
        { status: 202, headers: jsonHeaders },
      )
    }

    const built = buildSubmission(formType, body, metadata, now)
    if (!built.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'validation_failed',
          formType,
          requestId,
          details: built.errors,
        },
        { status: 400, headers: jsonHeaders },
      )
    }

    const rateLimit = checkFormRateLimit({
      formType,
      emailHash: built.submission.emailHash,
      ipHash: metadata.ipHash,
      now,
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'rate_limited',
          formType,
          requestId,
          reason: rateLimit.reason,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429, headers: jsonHeaders },
      )
    }

    const pipelineResult = await submitS3FirstForm(built.submission, {
      requestId,
      now,
      s3Writer: createConfiguredS3Writer({ failMock: process.env.FORM_PIPELINE_MOCK_S3_FAIL === 'true' }),
    })

    return NextResponse.json(toPublicResponse(pipelineResult), {
      status: pipelineResult.duplicate ? 202 : 200,
      headers: jsonHeaders,
    })
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        {
          success: false,
          error: error.code,
          formType,
          requestId,
        },
        { status: error.status, headers: jsonHeaders },
      )
    }

    if (error instanceof S3PersistenceError) {
      return NextResponse.json(
        {
          success: false,
          error: error.code,
          formType,
          requestId,
          sideEffectsSkipped: true,
        },
        { status: error.status, headers: jsonHeaders },
      )
    }

    if (error instanceof FormPipelineError) {
      return NextResponse.json(
        {
          success: false,
          error: error.code,
          formType,
          requestId,
        },
        { status: error.status, headers: jsonHeaders },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'form_pipeline_failed',
        formType,
        requestId,
      },
      { status: 500, headers: jsonHeaders },
    )
  }
}

function buildSubmission(
  formType: FormType,
  body: Record<string, unknown>,
  metadata: Parameters<typeof buildBuyerSignupSubmission>[1],
  now: Date,
): BuildSubmissionResult {
  if (formType === 'seller-lead') {
    return buildSellerLeadSubmission(body, metadata, now)
  }

  if (formType === 'buyer-signup') {
    return buildBuyerSignupSubmission(body, metadata, now)
  }

  return buildDealInterestSubmission(body, metadata, now)
}

function getFormSuccessMessage(formType: FormType): string {
  if (formType === 'seller-lead') {
    return "Got it. We'll review the property and follow up shortly."
  }

  if (formType === 'buyer-signup') {
    return "You're on the list. We'll send deals that match your buy box."
  }

  return "Got it. We'll follow up with next steps on this deal."
}

function toPublicResponse(result: S3FirstSubmissionResult) {
  return {
    success: true,
    accepted: true,
    duplicate: result.duplicate,
    formType: result.formType,
    message: getFormSuccessMessage(result.formType),
    requestId: result.requestId,
  }
}

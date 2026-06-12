'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

type InlineFormStatusState = 'idle' | 'submitting' | 'success' | 'error'

type InlineFormStatus = {
  state: InlineFormStatusState
  message: string
}

type InlineFormSubmitOptions = {
  successMessage: string
  requireServiceConsentForPhone?: boolean
}

const idleStatus: InlineFormStatus = {
  state: 'idle',
  message: '',
}

const defaultErrorMessage = "We couldn't send that. Please try again."

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function getValidationMessage(payload: unknown): string | null {
  if (!isRecord(payload) || !Array.isArray(payload.details)) {
    return null
  }

  const firstDetail = payload.details.find(isRecord)
  const message = firstDetail?.message
  return typeof message === 'string' && message.trim() ? message : null
}

function getPublicErrorMessage(payload: unknown, status: number): string {
  if (isRecord(payload)) {
    if (payload.error === 'validation_failed') {
      return getValidationMessage(payload) ?? 'Please check the form and try again.'
    }

    if (payload.error === 'rate_limited') {
      return 'Too many attempts. Please wait a few minutes and try again.'
    }

    if (payload.error === 'request_body_too_large') {
      return 'That submission is too large. Please shorten it and try again.'
    }
  }

  if (status >= 500) {
    return "We couldn't send that right now. Please try again in a few minutes."
  }

  return defaultErrorMessage
}

function getSuccessMessage(payload: unknown, fallback: string): string {
  if (isRecord(payload) && typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message
  }

  return fallback
}

const phoneConsentMessage = 'Check the service SMS consent box or clear the phone number.'

function getPhoneDigits(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.replace(/\D/g, '') : ''
}

function findInput(form: HTMLFormElement, name: string): HTMLInputElement | null {
  const element = form.elements.namedItem(name)
  return element instanceof HTMLInputElement ? element : null
}

function validatePhoneConsent(form: HTMLFormElement, formData: FormData): boolean {
  const phoneDigits = getPhoneDigits(formData.get('phone'))
  if (phoneDigits.length === 0 || formData.get('serviceConsent') === 'true') {
    return true
  }

  const serviceConsentInput = findInput(form, 'serviceConsent')
  if (serviceConsentInput) {
    serviceConsentInput.setCustomValidity(phoneConsentMessage)
    serviceConsentInput.reportValidity()
    serviceConsentInput.focus()
    serviceConsentInput.addEventListener('change', () => serviceConsentInput.setCustomValidity(''), { once: true })
  }

  return false
}

export function useInlineFormSubmit({ successMessage, requireServiceConsentForPhone = false }: InlineFormSubmitOptions) {
  const [status, setStatus] = useState<InlineFormStatus>(idleStatus)
  const isSubmitting = status.state === 'submitting'

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) {
      return false
    }

    const form = event.currentTarget
    const action = form.action
    const method = form.method || 'post'
    const formData = new FormData(form)

    if (requireServiceConsentForPhone && !validatePhoneConsent(form, formData)) {
      setStatus({ state: 'error', message: phoneConsentMessage })
      return false
    }

    const body = new URLSearchParams()
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        body.append(key, value)
      }
    }
    setStatus({ state: 'submitting', message: 'Sending...' })

    try {
      const response = await fetch(action, {
        method: method.toUpperCase(),
        body,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      const contentType = response.headers.get('content-type') ?? ''
      const payload: unknown = contentType.includes('application/json') ? await response.json() : null

      if (!response.ok || (isRecord(payload) && payload.success !== true)) {
        throw new Error(getPublicErrorMessage(payload, response.status))
      }

      form.reset()
      setStatus({ state: 'success', message: getSuccessMessage(payload, successMessage) })
      return true
    } catch (error) {
      setStatus({
        state: 'error',
        message: error instanceof Error && error.message ? error.message : defaultErrorMessage,
      })
      return false
    }
  }

  return {
    isSubmitting,
    status,
    submitForm,
  }
}

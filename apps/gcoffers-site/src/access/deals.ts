import type { FieldAccess } from 'payload'

import { isAdminOrEditor } from './roles'

type ExactAddressVisibilitySource = {
  showExactAddressPublicly?: boolean | null
}

const canExposeExactAddressToPublic = (source: unknown): boolean => {
  if (source === null || typeof source !== 'object') {
    return false
  }

  return (source as ExactAddressVisibilitySource).showExactAddressPublicly === true
}

export const exactAddressPublicOrStaffFieldAccess: FieldAccess = ({ data, doc, req, siblingData }) => {
  if (isAdminOrEditor(req.user)) {
    return true
  }

  return (
    canExposeExactAddressToPublic(doc) ||
    canExposeExactAddressToPublic(siblingData) ||
    canExposeExactAddressToPublic(data)
  )
}

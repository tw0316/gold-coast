import type { Access, FieldAccess, PayloadRequest, Where } from 'payload'

export type GcoffersUserRole = 'admin' | 'editor'

type RoleBearingUser = PayloadRequest['user'] & {
  role?: string | null
}

const getUserRole = (user: PayloadRequest['user']): GcoffersUserRole | null => {
  if (user && typeof user === 'object' && 'role' in user) {
    const role = (user as RoleBearingUser).role?.toLowerCase() ?? null
    if (role === 'admin' || role === 'editor') {
      return role
    }
  }

  return null
}

const isAuthenticatedUser = (user: PayloadRequest['user']): boolean =>
  Boolean(user && typeof user === 'object' && 'id' in user)

export const hasRole = (
  user: PayloadRequest['user'],
  allowedRoles: readonly GcoffersUserRole[],
): boolean => {
  const role = getUserRole(user)
  return role !== null && allowedRoles.includes(role)
}

export const isAdmin = (user: PayloadRequest['user']): boolean => hasRole(user, ['admin'])

export const isEditor = (user: PayloadRequest['user']): boolean => hasRole(user, ['editor'])

export const isAdminOrEditor = (user: PayloadRequest['user']): boolean =>
  hasRole(user, ['admin', 'editor']) || isAuthenticatedUser(user)

export const adminOnly: Access = ({ req }) => isAdmin(req.user)

export const adminOrEditor: Access = ({ req }) => isAdminOrEditor(req.user)

export const adminOnlyFieldAccess: FieldAccess = ({ req }) => isAdmin(req.user)

export const adminOrEditorFieldAccess: FieldAccess = ({ req }) => isAdminOrEditor(req.user)

export const publicReadOrStaff = (publicWhere: Where): Access => {
  return ({ req }) => {
    if (isAdminOrEditor(req.user)) {
      return true
    }

    return publicWhere
  }
}

export const noPublicRead: Access = ({ req }) => isAdminOrEditor(req.user)

import { useMemo } from 'react'
import { useAuth } from './useAuth'

export const PERMISSIONS = {
  EMPLOYEE_CREATE: 'employee:create',
  EMPLOYEE_VIEW: 'employee:view',
  EMPLOYEE_EDIT: 'employee:edit',
  EMPLOYEE_DELETE: 'employee:delete',
  EMPLOYEE_RELIEVE: 'employee:relieve',
  ONBOARDING_UPDATE: 'onboarding:update',
  RELIEVING_UPDATE: 'relieving:update',
  ASSET_CREATE: 'asset:create',
  ASSET_VIEW: 'asset:view',
  ASSET_EDIT: 'asset:edit',
  ASSET_ASSIGN: 'asset:assign',
  ASSET_REPLACE: 'asset:replace',
  ASSET_MARK_REPAIR: 'asset:mark_repair',
  ASSET_RETIRE: 'asset:retire',
  ASSET_HISTORY: 'asset:history',
  DOCUMENT_UPLOAD: 'document:upload',
  DOCUMENT_VIEW: 'document:view',
  DOCUMENT_DELETE: 'document:delete',
  KB_MANAGE: 'kb:manage',
  AUDIT_VIEW: 'audit:view',
  DASHBOARD_EXPORT: 'dashboard:export',
  USER_CREATE: 'user:create',
}

const ROLE_PERMISSIONS = {
  admin: new Set(Object.values(PERMISSIONS)),
  hr: new Set([
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_VIEW,
    PERMISSIONS.EMPLOYEE_EDIT,
    PERMISSIONS.EMPLOYEE_RELIEVE,
    PERMISSIONS.ONBOARDING_UPDATE,
    PERMISSIONS.RELIEVING_UPDATE,
    PERMISSIONS.ASSET_VIEW,
    PERMISSIONS.ASSET_HISTORY,
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.AUDIT_VIEW,
  ]),
  it: new Set([
    PERMISSIONS.EMPLOYEE_VIEW,
    PERMISSIONS.ONBOARDING_UPDATE,
    PERMISSIONS.RELIEVING_UPDATE,
    PERMISSIONS.ASSET_CREATE,
    PERMISSIONS.ASSET_VIEW,
    PERMISSIONS.ASSET_EDIT,
    PERMISSIONS.ASSET_ASSIGN,
    PERMISSIONS.ASSET_REPLACE,
    PERMISSIONS.ASSET_MARK_REPAIR,
    PERMISSIONS.ASSET_RETIRE,
    PERMISSIONS.ASSET_HISTORY,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.DOCUMENT_DELETE,
  ]),
  finance: new Set([
    PERMISSIONS.EMPLOYEE_VIEW,
    PERMISSIONS.ONBOARDING_UPDATE,
    PERMISSIONS.RELIEVING_UPDATE,
    PERMISSIONS.ASSET_VIEW,
    PERMISSIONS.DOCUMENT_VIEW,
  ]),
  admin_dept: new Set([
    PERMISSIONS.EMPLOYEE_VIEW,
    PERMISSIONS.ONBOARDING_UPDATE,
    PERMISSIONS.RELIEVING_UPDATE,
    PERMISSIONS.ASSET_VIEW,
    PERMISSIONS.DOCUMENT_VIEW,
  ]),
  auditor: new Set([
    PERMISSIONS.EMPLOYEE_VIEW,
    PERMISSIONS.ASSET_VIEW,
    PERMISSIONS.ASSET_HISTORY,
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.DASHBOARD_EXPORT,
  ]),
}

export const STEP_CATEGORY_OWNERS = {
  HR: ['admin', 'hr'],
  Finance: ['admin', 'finance'],
  Admin: ['admin', 'admin_dept'],
  IT: ['admin', 'it'],
}

export function usePermissions() {
  const { user } = useAuth()

  const perms = useMemo(() => {
    if (!user?.role) return new Set()
    return ROLE_PERMISSIONS[user.role] || new Set()
  }, [user])

  const can = (permission) => perms.has(permission)
  const canAny = (...permissions) => permissions.some((permission) => perms.has(permission))
  const canAll = (...permissions) => permissions.every((permission) => perms.has(permission))
  const canUpdateStepCategory = (category) => {
    if (!user?.role) return false
    return (STEP_CATEGORY_OWNERS[category] || []).includes(user.role)
  }

  return { can, canAny, canAll, canUpdateStepCategory, role: user?.role || null }
}

export function PermissionGuard({ permission, fallback = null, children }) {
  const { can } = usePermissions()
  return can(permission) ? children : fallback
}

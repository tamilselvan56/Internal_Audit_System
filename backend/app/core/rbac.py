from enum import Enum
from functools import lru_cache
from typing import Dict, FrozenSet, Set

from fastapi import Depends, HTTPException, status

from app.core.auth import get_current_user
from app.models.models import User, UserRole


class Permission(str, Enum):
    EMPLOYEE_CREATE = "employee:create"
    EMPLOYEE_VIEW = "employee:view"
    EMPLOYEE_EDIT = "employee:edit"
    EMPLOYEE_DELETE = "employee:delete"
    EMPLOYEE_RELIEVE = "employee:relieve"
    ONBOARDING_VIEW = "onboarding:view"
    ONBOARDING_UPDATE = "onboarding:update"
    RELIEVING_VIEW = "relieving:view"
    RELIEVING_UPDATE = "relieving:update"
    ASSET_CREATE = "asset:create"
    ASSET_VIEW = "asset:view"
    ASSET_EDIT = "asset:edit"
    ASSET_DELETE = "asset:delete"
    ASSET_ASSIGN = "asset:assign"
    ASSET_REPLACE = "asset:replace"
    ASSET_MARK_REPAIR = "asset:mark_repair"
    ASSET_RETIRE = "asset:retire"
    ASSET_HISTORY = "asset:history"
    DOCUMENT_UPLOAD = "document:upload"
    DOCUMENT_VIEW = "document:view"
    DOCUMENT_DELETE = "document:delete"
    KB_VIEW = "kb:view"
    KB_MANAGE = "kb:manage"
    AUDIT_VIEW = "audit:view"
    DASHBOARD_VIEW = "dashboard:view"
    DASHBOARD_EXPORT = "dashboard:export"
    USER_CREATE = "user:create"
    USER_VIEW = "user:view"
    USER_EDIT = "user:edit"
    USER_DELETE = "user:delete"


ROLE_PERMISSIONS: Dict[UserRole, FrozenSet[Permission]] = {
    UserRole.admin: frozenset(Permission),
    UserRole.hr: frozenset({
        Permission.EMPLOYEE_CREATE,
        Permission.EMPLOYEE_VIEW,
        Permission.EMPLOYEE_EDIT,
        Permission.EMPLOYEE_RELIEVE,
        Permission.ONBOARDING_VIEW,
        Permission.ONBOARDING_UPDATE,
        Permission.RELIEVING_VIEW,
        Permission.RELIEVING_UPDATE,
        Permission.ASSET_VIEW,
        Permission.ASSET_HISTORY,
        Permission.DOCUMENT_VIEW,
        Permission.KB_VIEW,
        Permission.DASHBOARD_VIEW,
        Permission.AUDIT_VIEW,
    }),
    UserRole.it: frozenset({
        Permission.EMPLOYEE_VIEW,
        Permission.ONBOARDING_VIEW,
        Permission.ONBOARDING_UPDATE,
        Permission.RELIEVING_VIEW,
        Permission.RELIEVING_UPDATE,
        Permission.ASSET_CREATE,
        Permission.ASSET_VIEW,
        Permission.ASSET_EDIT,
        Permission.ASSET_ASSIGN,
        Permission.ASSET_REPLACE,
        Permission.ASSET_MARK_REPAIR,
        Permission.ASSET_RETIRE,
        Permission.ASSET_HISTORY,
        Permission.DOCUMENT_UPLOAD,
        Permission.DOCUMENT_VIEW,
        Permission.DOCUMENT_DELETE,
        Permission.KB_VIEW,
        Permission.DASHBOARD_VIEW,
    }),
    UserRole.finance: frozenset({
        Permission.EMPLOYEE_VIEW,
        Permission.ONBOARDING_VIEW,
        Permission.ONBOARDING_UPDATE,
        Permission.RELIEVING_VIEW,
        Permission.RELIEVING_UPDATE,
        Permission.ASSET_VIEW,
        Permission.DOCUMENT_VIEW,
        Permission.DASHBOARD_VIEW,
    }),
    UserRole.admin_dept: frozenset({
        Permission.EMPLOYEE_VIEW,
        Permission.ONBOARDING_VIEW,
        Permission.ONBOARDING_UPDATE,
        Permission.RELIEVING_VIEW,
        Permission.RELIEVING_UPDATE,
        Permission.ASSET_VIEW,
        Permission.DOCUMENT_VIEW,
        Permission.DASHBOARD_VIEW,
    }),
    UserRole.auditor: frozenset({
        Permission.EMPLOYEE_VIEW,
        Permission.ONBOARDING_VIEW,
        Permission.RELIEVING_VIEW,
        Permission.ASSET_VIEW,
        Permission.ASSET_HISTORY,
        Permission.DOCUMENT_VIEW,
        Permission.AUDIT_VIEW,
        Permission.DASHBOARD_VIEW,
        Permission.DASHBOARD_EXPORT,
        Permission.KB_VIEW,
    }),
}


STEP_CATEGORY_OWNERS: Dict[str, Set[UserRole]] = {
    "HR": {UserRole.admin, UserRole.hr},
    "Finance": {UserRole.admin, UserRole.finance},
    "Admin": {UserRole.admin, UserRole.admin_dept},
    "IT": {UserRole.admin, UserRole.it},
}


@lru_cache(maxsize=256)
def get_permissions(role: UserRole) -> FrozenSet[Permission]:
    return ROLE_PERMISSIONS.get(role, frozenset())


def has_permission(user: User, permission: Permission) -> bool:
    return permission in get_permissions(user.role)


def can_update_step_category(user: User, category: str) -> bool:
    return user.role in STEP_CATEGORY_OWNERS.get(category, set())


def require_permission(*permissions: Permission):
    async def checker(current_user: User = Depends(get_current_user)):
        for permission in permissions:
            if not has_permission(current_user, permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied: {permission.value}",
                )
        return current_user
    return checker


def require_any_permission(*permissions: Permission):
    async def checker(current_user: User = Depends(get_current_user)):
        if not any(has_permission(current_user, permission) for permission in permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user
    return checker


def require_step_category_ownership(category: str):
    async def checker(current_user: User = Depends(get_current_user)):
        if not can_update_step_category(current_user, category):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Your role cannot update {category} checklist steps",
            )
        return current_user
    return checker

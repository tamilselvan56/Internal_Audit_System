from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models.models import UserRole, AssetStatus, EmployeeStatus, AssetCondition


# ── Auth ──────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.hr


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# ── Employee ──────────────────────────────────────────────────────────────────
class EmployeeCreate(BaseModel):
    employee_id: str
    full_name: str
    email: EmailStr
    department: str
    designation: str
    manager_name: Optional[str] = None
    phone: Optional[str] = None
    join_date: Optional[datetime] = None

    # Extended fields
    group_company: Optional[str] = None
    partner_company: Optional[str] = None
    location: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    blood_group: Optional[str] = None
    emergency_contact: Optional[str] = None
    personal_email: Optional[str] = None
    aadhaar_number: Optional[str] = None
    comments: Optional[str] = None


class EmployeeOut(BaseModel):
    id: int
    employee_id: str
    full_name: str
    email: str
    department: str
    designation: str
    manager_name: Optional[str]
    phone: Optional[str]
    status: EmployeeStatus
    join_date: Optional[datetime]
    relieve_date: Optional[datetime]
    created_at: datetime

    # Extended fields
    group_company: Optional[str]
    partner_company: Optional[str]
    location: Optional[str]
    date_of_birth: Optional[datetime]
    blood_group: Optional[str]
    emergency_contact: Optional[str]
    personal_email: Optional[str]
    aadhaar_number: Optional[str]
    comments: Optional[str]

    onboarding_steps: List["OnboardingStepOut"] = []
    relieving_steps: List["RelievingStepOut"] = []

    class Config:
        from_attributes = True


class EmployeeList(BaseModel):
    id: int
    employee_id: str
    full_name: str
    department: str
    designation: str
    status: EmployeeStatus
    join_date: Optional[datetime]
    group_company: Optional[str]
    location: Optional[str]

    class Config:
        from_attributes = True


# ── Onboarding Steps ──────────────────────────────────────────────────────────
class OnboardingStepOut(BaseModel):
    id: int
    step_name: str
    step_category: Optional[str]
    is_completed: bool
    completed_by: Optional[str]
    completed_at: Optional[datetime]
    notes: Optional[str]

    class Config:
        from_attributes = True


class StepUpdate(BaseModel):
    is_completed: bool
    completed_by: Optional[str] = None
    notes: Optional[str] = None


# ── Relieving Steps ───────────────────────────────────────────────────────────
class RelievingStepOut(BaseModel):
    id: int
    step_name: str
    step_category: Optional[str]
    is_completed: bool
    completed_by: Optional[str]
    completed_at: Optional[datetime]
    notes: Optional[str]

    class Config:
        from_attributes = True


class RelieveEmployee(BaseModel):
    relieve_date: datetime
    reason: Optional[str] = None


# ── Asset ─────────────────────────────────────────────────────────────────────
class AssetCreate(BaseModel):
    asset_tag: str
    asset_type: str
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[datetime] = None
    purchase_cost: Optional[str] = None
    warranty_expiry: Optional[datetime] = None
    vendor_name: Optional[str] = None
    vendor_invoice_no: Optional[str] = None
    mac_address: Optional[str] = None
    processor: Optional[str] = None
    ram_gb: Optional[int] = None
    storage_gb: Optional[int] = None
    os_installed: Optional[str] = None
    location: Optional[str] = None
    condition: Optional[AssetCondition] = None
    notes: Optional[str] = None


class AssetOut(BaseModel):
    id: int
    asset_tag: str
    asset_type: str
    brand: Optional[str]
    model: Optional[str]
    serial_number: Optional[str]
    condition: Optional[AssetCondition]
    purchase_date: Optional[datetime]
    purchase_cost: Optional[str]
    warranty_expiry: Optional[datetime]
    vendor_name: Optional[str]
    vendor_invoice_no: Optional[str]
    mac_address: Optional[str]
    processor: Optional[str]
    ram_gb: Optional[int]
    storage_gb: Optional[int]
    os_installed: Optional[str]
    location: Optional[str]
    status: AssetStatus
    current_assigned_to: Optional[int]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AssetAssign(BaseModel):
    employee_id: int
    performed_by: str
    notes: Optional[str] = None


class AssetReplace(BaseModel):
    new_asset_id: int
    employee_id: int
    reason: str
    performed_by: str


class AssetAssignmentOut(BaseModel):
    id: int
    asset_id: int
    employee_id: int
    action: str
    action_date: datetime
    performed_by: Optional[str]
    reason: Optional[str]
    previous_asset_id: Optional[int] = None

    class Config:
        from_attributes = True


class AssetRepairTicketOut(BaseModel):
    id: int
    asset_id: int
    ticket_no: str
    issue_reported: str
    reported_by: Optional[str]
    vendor: Optional[str]
    estimated_cost: Optional[str]
    actual_cost: Optional[str]
    repair_status: str
    opened_at: datetime
    closed_at: Optional[datetime]
    resolution: Optional[str]

    class Config:
        from_attributes = True


class AssetDocumentOut(BaseModel):
    id: int
    asset_id: int
    title: str
    category: Optional[str]
    file_path: str
    file_name: str
    file_size_kb: Optional[int]
    uploaded_by: Optional[str]
    uploaded_at: datetime

    class Config:
        from_attributes = True


class AssetRepairOpenResponse(BaseModel):
    success: bool
    ticket_no: str
    asset_id: int


class AssetRepairCloseResponse(BaseModel):
    success: bool
    asset_id: int
    status: AssetStatus


class AssetDocumentUploadResponse(BaseModel):
    success: bool
    asset_id: int
    title: str
    category: Optional[str]
    file_name: str
    file_path: str
    file_size_kb: Optional[int]


# ── RAG ───────────────────────────────────────────────────────────────────────
class QueryRequest(BaseModel):
    question: str


class QueryResponse(BaseModel):
    answer: str
    sources: List[str]
    chunks_used: int


# ── Dashboard ─────────────────────────────────────────────────────────────────
class DashboardStats(BaseModel):
    total_employees: int
    active_employees: int
    relieved_employees: int
    total_assets: int
    available_assets: int
    assigned_assets: int
    pending_onboardings: int
    pending_relievings: int


EmployeeOut.model_rebuild()

import io
import re
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from jose import jwt
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from app.core.config import settings
from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.rbac import Permission, can_update_step_category, require_permission
from app.models.models import Employee, OnboardingStep, RelievingStep, EmployeeStatus, AuditLog, User, EmployeeDocument, AssetAssignment, Asset
from app.models.schemas import (
    EmployeeCreate, EmployeeOut, EmployeeList, StepUpdate,
    OnboardingStepOut, RelievingStepOut, RelieveEmployee
)

router = APIRouter(prefix="/api/hr", tags=["HR"])


def _enforce_step_category_access(current_user: User, step_category: str | None):
    category = step_category or "Other"
    if not can_update_step_category(current_user, category):
        raise HTTPException(
            status_code=403,
            detail=f"Your role cannot update {category} checklist steps",
        )


def _sanitize_filename(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", (name or "").strip())
    return cleaned.strip("._") or "employee"


def _draw_wrapped_text(c: canvas.Canvas, text: str, x: float, y: float, max_width: float, font_name: str = "Helvetica", font_size: int = 10):
    c.setFont(font_name, font_size)
    words = (text or "").split()
    if not words:
        return y - (font_size + 4)

    line = words[0]
    for word in words[1:]:
        trial = f"{line} {word}"
        if stringWidth(trial, font_name, font_size) <= max_width:
            line = trial
        else:
            c.drawString(x, y, line)
            y -= font_size + 4
            line = word
    c.drawString(x, y, line)
    return y - (font_size + 4)


def _create_document_link_token(doc_id: int, expires_minutes: int = 30) -> str:
    payload = {
        "scope": "employee_doc_file",
        "doc_id": doc_id,
        "exp": datetime.utcnow() + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

# ── HR Department Checklist ──────────────────────────────────────────────────
HR_ONBOARDING_TEMPLATE = [
    ("Buddy Allocation", "HR"),
    ("Floorwalk", "HR"),
    ("Office Space Allocation", "HR"),
    ("Laptop/Desktop Allocation", "HR"),
    ("Paper work", "HR"),
    ("NDA", "HR"),
    ("Appointment Letter Generation", "HR"),
    ("Email ID", "HR"),
    ("Teams", "HR"),
    ("Induction Mail", "HR"),
    ("Employee ID updated in HRMS", "HR"),
    ("Date of Birth as per proofs submitted updated in HRMS", "HR"),
    ("Employee Contact Number updated in HRMS", "HR"),
    ("Emergency Contact Number updated in HRMS", "HR"),
    ("Blood Group in HRMS", "HR"),
    ("Buddy + RM introduction", "HR"),
    ("Welcome Mailer", "HR"),
    ("HRMS Account creation", "HR"),
    ("Leaves Uploaded in HRMS", "HR"),
    ("Credentials shared with resource", "HR"),
    ("Birthday + Anniversary + Photo in HRMS", "HR"),
    ("Leaves Tracker Updated", "HR"),
    ("Unit Head Orientation session", "HR"),
    ("L1 Orientation", "HR"),
    ("BGV", "HR"),
]

# ── Finance Department Checklist ─────────────────────────────────────────────
FINANCE_ONBOARDING_TEMPLATE = [
    ("Appointment Letter", "Finance"),
    ("KYC Update", "Finance"),
    ("Medical Insurance", "Finance"),
    ("IT Declaration", "Finance"),
    ("HDFC Salary Account", "Finance"),
]

# ── Admin/HR Department Checklist ────────────────────────────────────────────
ADMIN_ONBOARDING_TEMPLATE = [
    ("Logistics Feedback from Employees", "Admin"),
    ("Office space allocation", "Admin"),
    ("Biometric registration", "Admin"),
    ("Id card - Soft copy", "Admin"),
    ("Employee details", "Admin"),
    ("Doodle book for DC", "Admin"),
    ("Gramener Bag", "Admin"),
    ("Welcome Kit (Dispatched/In-transit/Received)", "Admin"),
    ("Covid Insurance", "Admin"),
]

# ── IT Department Checklist ──────────────────────────────────────────────────
IT_ONBOARDING_TEMPLATE = [
    ("Email", "IT"),
    ("DL (Distribution List)", "IT"),
    ("O365", "IT"),
    ("SharePoint", "IT"),
    ("PC/Laptop", "IT"),
    ("Laptop Ship/Receive dates", "IT"),
    ("IT Asset Allocation Form", "IT"),
    ("Data card", "IT"),
    ("Other Assets", "IT"),
    ("WiKi (Digital)", "IT"),
    ("Kaspersky/Sophos", "IT"),
    ("Domain policies", "IT"),
    ("Onboarding Email", "IT"),
]

# ── Full combined onboarding template (department tagged) ────────────────────
ONBOARDING_TEMPLATE = (
    HR_ONBOARDING_TEMPLATE
    + FINANCE_ONBOARDING_TEMPLATE
    + ADMIN_ONBOARDING_TEMPLATE
    + IT_ONBOARDING_TEMPLATE
)

# ── Offboarding / Relieving Template ─────────────────────────────────────────
RELIEVING_TEMPLATE = [
    # HR steps
    ("Confirm LWD from Reporting Manager (within 2 weeks of resignation)", "HR"),
    ("Send exit mail to support@company.com (1 week before LWD)", "HR"),
    ("Collect Aadhaar card copy with address and personal Gmail from employee", "HR"),
    ("Share NDA with employee and obtain signed copy on or before LWD", "HR"),
    ("Issue Relieving Letter to employee's personal email", "HR"),
    ("Issue Service Letter to employee's personal email", "HR"),
    ("Create FnF sheet with basic details and share with HR", "HR"),
    ("Update off-boarding tracker with all necessary details", "HR"),
    # IT steps
    ("Coordinate with employee for laptop return", "IT"),
    ("Deactivate Email ID credentials", "IT"),
    ("Update Laptop details in S&H tracker", "IT"),
    ("Revoke O365 / SharePoint / Domain access", "IT"),
    ("Revoke all system and tool access", "IT"),
    # Admin steps
    ("Collect ID card from employee", "Admin"),
    ("Collect access card from employee", "Admin"),
    # Finance steps
    ("Settle pending expense claims", "Finance"),
    ("Process Final & Full settlement (FnF)", "Finance"),
    ("Issue No Dues Certificate", "Finance"),
]


@router.post("/employees", response_model=EmployeeOut)
def create_employee(data: EmployeeCreate, db: Session = Depends(get_db), current_user: User = Depends(require_permission(Permission.EMPLOYEE_CREATE))):
    existing = db.query(Employee).filter(
        (Employee.email == data.email) | (Employee.employee_id == data.employee_id)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee with this ID or email already exists")

    employee = Employee(**data.model_dump(), created_by=current_user.id)
    db.add(employee)
    db.flush()

    for step_name, category in ONBOARDING_TEMPLATE:
        db.add(OnboardingStep(employee_id=employee.id, step_name=step_name, step_category=category))

    db.add(AuditLog(action=f"Created employee {data.full_name}", module="HR", record_id=employee.id, performed_by=current_user.id))
    db.commit()
    db.refresh(employee)
    return employee


@router.get("/employees", response_model=List[EmployeeList])
def list_employees(status: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Employee)
    if status:
        q = q.filter(Employee.status == status)
    return q.order_by(Employee.created_at.desc()).all()


@router.get("/employees/{employee_id}", response_model=EmployeeOut)
def get_employee(employee_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.get("/employees/{employee_id}/export/pdf")
def export_employee_pdf(
    employee_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.EMPLOYEE_VIEW)),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    documents = db.query(EmployeeDocument).filter(EmployeeDocument.employee_id == employee_id).order_by(EmployeeDocument.uploaded_at.desc()).all()

    latest_assignment = db.query(AssetAssignment).filter(
        AssetAssignment.employee_id == employee_id,
        AssetAssignment.action.in_(["assigned", "replaced"])
    ).order_by(AssetAssignment.action_date.desc()).first()
    assigned_asset = None
    if latest_assignment:
        assigned_asset = db.query(Asset).filter(Asset.id == latest_assignment.asset_id).first()

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    page_width, page_height = A4
    margin = 40
    y = page_height - margin

    def ensure_space(lines: int = 1):
        nonlocal y
        if y < margin + (lines * 14):
            c.showPage()
            y = page_height - margin

    def heading(text: str):
        nonlocal y
        ensure_space(2)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(margin, y, text)
        y -= 18

    def line(text: str, font: str = "Helvetica", size: int = 10):
        nonlocal y
        ensure_space(1)
        y = _draw_wrapped_text(c, text, margin, y, page_width - (margin * 2), font, size)

    def linked_line(label: str, url: str, font: str = "Helvetica", size: int = 10):
        nonlocal y
        ensure_space(1)
        c.setFont(font, size)
        c.drawString(margin, y, label)
        text_width = stringWidth(label, font, size)
        c.linkURL(url, (margin, y - 2, margin + text_width, y + size), relative=0)
        y -= size + 4

    c.setTitle(f"{employee.full_name} - Employee Details")
    c.setFont("Helvetica-Bold", 16)
    c.drawString(margin, y, f"Employee Details - {employee.full_name}")
    y -= 22
    c.setFont("Helvetica", 10)
    c.drawString(margin, y, f"Generated on: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
    y -= 18

    heading("Basic Information")
    fields = [
        ("Employee ID", employee.employee_id),
        ("Full Name", employee.full_name),
        ("Email", employee.email),
        ("Personal Email", employee.personal_email or "-"),
        ("Department", employee.department),
        ("Designation", employee.designation),
        ("Status", employee.status.value if employee.status else "-"),
        ("Manager", employee.manager_name or "-"),
        ("Phone", employee.phone or "-"),
        ("Emergency Contact", employee.emergency_contact or "-"),
        ("Group Company", employee.group_company or "-"),
        ("Partner Company", employee.partner_company or "-"),
        ("Location", employee.location or "-"),
        ("Blood Group", employee.blood_group or "-"),
        ("Join Date", employee.join_date.strftime("%Y-%m-%d") if employee.join_date else "-"),
        ("Relieve Date", employee.relieve_date.strftime("%Y-%m-%d") if employee.relieve_date else "-"),
        ("Comments", employee.comments or "-"),
    ]
    for label, value in fields:
        line(f"{label}: {value}")

    heading("Current Asset")
    if assigned_asset:
        line(f"Asset Tag: {assigned_asset.asset_tag}")
        line(f"Type: {assigned_asset.asset_type}")
        line(f"Model: {(assigned_asset.brand or '-')} {(assigned_asset.model or '')}".strip())
        line(f"Status: {assigned_asset.status.value if assigned_asset.status else '-'}")
    else:
        line("No currently assigned asset.")

    heading("Certificates")
    if documents:
        base_url = str(request.base_url).rstrip("/")
        for idx, doc in enumerate(documents, 1):
            uploaded_at = doc.uploaded_at.strftime("%Y-%m-%d") if doc.uploaded_at else "-"
            category = (doc.category or "other").replace("_", " ")
            signed_token = _create_document_link_token(doc.id, expires_minutes=30)
            file_url = f"{base_url}/api/documents/employees/document/{doc.id}/file?token={signed_token}"
            linked_line(
                f"{idx}. {doc.title} ({category}) - View Certificate",
                file_url,
            )
            line(f"   File: {doc.file_name} | Size: {doc.file_size_kb or 0} KB | Uploaded: {uploaded_at}", size=9)
    else:
        line("No certificates/documents found.")

    c.save()
    buffer.seek(0)
    filename = f"{_sanitize_filename(employee.full_name)}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.patch("/onboarding/{step_id}", response_model=OnboardingStepOut)
def update_onboarding_step(step_id: int, data: StepUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    step = db.query(OnboardingStep).filter(OnboardingStep.id == step_id).first()
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    _enforce_step_category_access(current_user, step.step_category)
    step.is_completed = data.is_completed
    if data.is_completed:
        step.completed_by = data.completed_by or current_user.name
        step.completed_at = datetime.utcnow()
    else:
        step.completed_by = None
        step.completed_at = None
    if data.notes:
        step.notes = data.notes
    db.commit()
    db.refresh(step)
    return step


@router.post("/employees/{employee_id}/relieve", response_model=EmployeeOut)
def relieve_employee(employee_id: int, data: RelieveEmployee, db: Session = Depends(get_db), current_user: User = Depends(require_permission(Permission.EMPLOYEE_RELIEVE))):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    if employee.status == EmployeeStatus.relieved:
        raise HTTPException(status_code=400, detail="Employee already relieved")

    employee.status = EmployeeStatus.relieved
    employee.relieve_date = data.relieve_date

    for step_name, category in RELIEVING_TEMPLATE:
        db.add(RelievingStep(employee_id=employee.id, step_name=step_name, step_category=category))

    db.add(AuditLog(action=f"Initiated relieving for {employee.full_name}", module="HR", record_id=employee.id, performed_by=current_user.id))
    db.commit()
    db.refresh(employee)
    return employee


@router.patch("/relieving/{step_id}", response_model=RelievingStepOut)
def update_relieving_step(step_id: int, data: StepUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    step = db.query(RelievingStep).filter(RelievingStep.id == step_id).first()
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    _enforce_step_category_access(current_user, step.step_category)
    step.is_completed = data.is_completed
    if data.is_completed:
        step.completed_by = data.completed_by or current_user.name
        step.completed_at = datetime.utcnow()
    else:
        step.completed_by = None
        step.completed_at = None
    if data.notes:
        step.notes = data.notes
    db.commit()
    db.refresh(step)
    return step

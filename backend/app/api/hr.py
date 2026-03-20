from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import Employee, OnboardingStep, RelievingStep, EmployeeStatus, AuditLog, User
from app.models.schemas import (
    EmployeeCreate, EmployeeOut, EmployeeList, StepUpdate,
    OnboardingStepOut, RelievingStepOut, RelieveEmployee
)

router = APIRouter(prefix="/api/hr", tags=["HR"])

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
def create_employee(data: EmployeeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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


@router.patch("/onboarding/{step_id}", response_model=OnboardingStepOut)
def update_onboarding_step(step_id: int, data: StepUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    step = db.query(OnboardingStep).filter(OnboardingStep.id == step_id).first()
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
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
def relieve_employee(employee_id: int, data: RelieveEmployee, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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

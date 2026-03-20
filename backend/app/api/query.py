from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import Employee, Asset, OnboardingStep, RelievingStep, EmployeeStatus, AssetStatus, User
from app.models.schemas import QueryRequest, QueryResponse, DashboardStats
from app.services.rag_service import rag_service

router = APIRouter(prefix="/api", tags=["Knowledge & Dashboard"])


@router.post("/query", response_model=QueryResponse)
def query_knowledge_base(req: QueryRequest, current_user: User = Depends(get_current_user)):
    result = rag_service.query(req.question)
    return result


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_emp = db.query(Employee).count()
    active_emp = db.query(Employee).filter(Employee.status == EmployeeStatus.active).count()
    relieved_emp = db.query(Employee).filter(Employee.status == EmployeeStatus.relieved).count()

    total_assets = db.query(Asset).count()
    available_assets = db.query(Asset).filter(Asset.status == AssetStatus.available).count()
    assigned_assets = db.query(Asset).filter(Asset.status == AssetStatus.assigned).count()

    # Pending onboardings: active employees with incomplete steps
    active_emp_ids = [e.id for e in db.query(Employee.id).filter(Employee.status == EmployeeStatus.active).all()]
    pending_onboard = 0
    for eid in active_emp_ids:
        incomplete = db.query(OnboardingStep).filter(
            OnboardingStep.employee_id == eid,
            OnboardingStep.is_completed == False
        ).count()
        if incomplete > 0:
            pending_onboard += 1

    relieved_emp_ids = [e.id for e in db.query(Employee.id).filter(Employee.status == EmployeeStatus.relieved).all()]
    pending_relieve = 0
    for eid in relieved_emp_ids:
        incomplete = db.query(RelievingStep).filter(
            RelievingStep.employee_id == eid,
            RelievingStep.is_completed == False
        ).count()
        if incomplete > 0:
            pending_relieve += 1

    return DashboardStats(
        total_employees=total_emp,
        active_employees=active_emp,
        relieved_employees=relieved_emp,
        total_assets=total_assets,
        available_assets=available_assets,
        assigned_assets=assigned_assets,
        pending_onboardings=pending_onboard,
        pending_relievings=pending_relieve,
    )

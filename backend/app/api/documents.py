import os
import time
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.rbac import Permission, has_permission, require_any_permission, require_permission
from app.models.models import (
    AuditLog,
    Employee,
    EmployeeDocument,
    OnboardingStep,
    RelievingStep,
    StepDocument,
    User,
)

router = APIRouter(prefix="/api/documents", tags=["Documents"])
oauth2_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

ALLOWED_TYPES = {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"}
MAX_SIZE_MB = 10


def _save_file(content: bytes, subdir: str, filename: str) -> str:
    out_dir = os.path.join(settings.UPLOAD_DIR, subdir)
    os.makedirs(out_dir, exist_ok=True)
    safe_name = f"{int(time.time())}_{filename.replace(' ', '_')}"
    path = os.path.join(out_dir, safe_name)
    with open(path, "wb") as f:
        f.write(content)
    return path


@router.post("/employees/{employee_id}")
async def upload_employee_document(
    employee_id: int,
    file: UploadFile = File(...),
    title: str = Form(...),
    category: str = Form("other"),
    notes: str = Form(""),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_permission(
        Permission.EMPLOYEE_CREATE,
        Permission.EMPLOYEE_EDIT,
    )),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type not allowed: {ext}")

    content = await file.read()
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds {MAX_SIZE_MB}MB limit")

    file_path = _save_file(content, f"employees/{employee_id}", file.filename or "upload")
    document = EmployeeDocument(
        employee_id=employee_id,
        title=title,
        file_path=file_path,
        file_name=file.filename or "upload",
        file_size_kb=len(content) // 1024,
        category=category,
        notes=notes or None,
        uploaded_by=current_user.name,
        uploaded_by_id=current_user.id,
    )
    db.add(document)
    db.add(AuditLog(
        action=f"Document '{title}' uploaded for {employee.full_name}",
        module="HR",
        record_id=employee_id,
        performed_by=current_user.id,
        performer_name=current_user.name,
        ip_address=request.client.host if request and request.client else None,
    ))
    db.commit()
    db.refresh(document)
    return {
        "id": document.id,
        "title": document.title,
        "category": document.category,
        "file_name": document.file_name,
        "size_kb": document.file_size_kb,
    }


@router.get("/employees/{employee_id}")
def list_employee_documents(
    employee_id: int,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DOCUMENT_VIEW)),
):
    query = db.query(EmployeeDocument).filter(EmployeeDocument.employee_id == employee_id)
    if category:
        query = query.filter(EmployeeDocument.category == category)
    docs = query.order_by(EmployeeDocument.uploaded_at.desc()).all()
    return [
        {
            "id": doc.id,
            "title": doc.title,
            "category": doc.category,
            "file_name": doc.file_name,
            "size_kb": doc.file_size_kb,
            "uploaded_by": doc.uploaded_by,
            "uploaded_at": doc.uploaded_at,
            "notes": doc.notes,
        }
        for doc in docs
    ]


@router.delete("/employees/document/{doc_id}")
def delete_employee_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_permission(
        Permission.EMPLOYEE_CREATE,
        Permission.EMPLOYEE_EDIT,
    )),
):
    doc = db.query(EmployeeDocument).filter(EmployeeDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)
    db.delete(doc)
    db.commit()
    return {"deleted": doc_id}


@router.get("/employees/document/{doc_id}/file")
def get_employee_document_file(
    doc_id: int,
    token: Optional[str] = None,
    bearer_token: Optional[str] = Depends(oauth2_optional),
    db: Session = Depends(get_db),
):
    doc = db.query(EmployeeDocument).filter(EmployeeDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.file_path or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Document file not found")

    authorized = False

    # 1) Signed link token for PDF-click flows (no Authorization header)
    if token:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            scope = payload.get("scope")
            token_doc_id = payload.get("doc_id")
            exp = payload.get("exp")
            if scope == "employee_doc_file" and int(token_doc_id) == doc_id:
                if exp is not None and datetime.utcnow().timestamp() <= float(exp):
                    authorized = True
        except (JWTError, ValueError, TypeError):
            authorized = False

    # 2) Normal authenticated access for in-app calls
    if not authorized and bearer_token:
        try:
            payload = jwt.decode(bearer_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            email = payload.get("sub")
            if email:
                user = db.query(User).filter(User.email == email, User.is_active == True).first()
                if user and has_permission(user, Permission.DOCUMENT_VIEW):
                    authorized = True
        except JWTError:
            authorized = False

    if not authorized:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return FileResponse(
        path=doc.file_path,
        filename=doc.file_name or os.path.basename(doc.file_path),
        media_type="application/octet-stream",
    )


@router.post("/steps/{step_type}/{step_id}")
async def upload_step_document(
    step_type: str,
    step_id: int,
    file: UploadFile = File(...),
    title: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DOCUMENT_UPLOAD)),
):
    if step_type not in {"onboarding", "relieving"}:
        raise HTTPException(status_code=400, detail="step_type must be 'onboarding' or 'relieving'")

    step_model = OnboardingStep if step_type == "onboarding" else RelievingStep
    step = db.query(step_model).filter(step_model.id == step_id).first()
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type not allowed: {ext}")

    content = await file.read()
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds {MAX_SIZE_MB}MB limit")

    file_path = _save_file(content, f"steps/{step_type}/{step_id}", file.filename or "upload")
    doc = StepDocument(
        step_id=step_id,
        step_type=step_type,
        title=title,
        file_path=file_path,
        file_name=file.filename or "upload",
        file_size_kb=len(content) // 1024,
        uploaded_by=current_user.name,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {"id": doc.id, "title": doc.title, "file_name": doc.file_name}


@router.get("/steps/{step_type}/{step_id}")
def list_step_documents(
    step_type: str,
    step_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DOCUMENT_VIEW)),
):
    docs = (
        db.query(StepDocument)
        .filter(StepDocument.step_id == step_id, StepDocument.step_type == step_type)
        .order_by(StepDocument.uploaded_at.desc())
        .all()
    )
    return [
        {
            "id": doc.id,
            "title": doc.title,
            "file_name": doc.file_name,
            "uploaded_by": doc.uploaded_by,
            "uploaded_at": doc.uploaded_at,
        }
        for doc in docs
    ]

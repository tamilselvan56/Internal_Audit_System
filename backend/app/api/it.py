import json
import os
import time
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.rbac import Permission, has_permission, require_any_permission, require_permission
from app.models.models import Asset, AssetAssignment, AssetDocument, AssetRepairTicket, AssetStatus, AuditLog, User
from app.models.schemas import AssetCreate, AssetOut, AssetAssign, AssetReplace, AssetAssignmentOut

router = APIRouter(prefix="/api/it", tags=["IT Assets"])
ASSET_META_MARKER = "\n<!--ASSET_META:"
ASSET_META_SUFFIX = "-->"


class AssetIntakeUpdate(BaseModel):
    ready_to_assign: Optional[bool] = None
    notes: Optional[str] = None
    physical_inspect_done: Optional[bool] = None
    box_contents_verified: Optional[bool] = None
    serial_number_verified: Optional[bool] = None
    asset_tag_affixed: Optional[bool] = None
    os_installed: Optional[bool] = None
    domain_joined: Optional[bool] = None
    antivirus_installed: Optional[bool] = None
    software_baseline_done: Optional[bool] = None
    bitlocker_enabled: Optional[bool] = None
    bios_password_set: Optional[bool] = None
    data_wiped_prev_user: Optional[bool] = None
    invoice_uploaded: Optional[bool] = None
    warranty_card_uploaded: Optional[bool] = None
    alloc_form_generated: Optional[bool] = None
    alloc_form_signed: Optional[bool] = None
    asset_registered_finance: Optional[bool] = None
    depreciation_entry_done: Optional[bool] = None


class AssetStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class RepairTicketOpen(BaseModel):
    issue_reported: str
    vendor: Optional[str] = None
    estimated_cost: Optional[str] = None


class RepairTicketClose(BaseModel):
    resolution: str
    repair_status: str = "completed"
    actual_cost: Optional[str] = None


def _get_asset_or_404(asset_id: int, db: Session) -> Asset:
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


def _add_audit(db: Session, *, action: str, record_id: int, current_user: User, details: str | None = None):
    db.add(AuditLog(
        action=action,
        module="IT",
        record_id=record_id,
        performed_by=current_user.id,
        performer_name=current_user.name,
        details=details,
    ))


def _split_asset_notes(notes: str | None) -> tuple[str | None, dict]:
    if not notes or ASSET_META_MARKER not in notes:
        return notes, {}
    visible, raw_meta = notes.split(ASSET_META_MARKER, 1)
    raw_meta = raw_meta.split(ASSET_META_SUFFIX, 1)[0].strip()
    try:
        meta = json.loads(raw_meta) if raw_meta else {}
    except json.JSONDecodeError:
        meta = {}
    visible = visible.rstrip() or None
    return visible, meta


def _write_asset_notes(asset: Asset, visible_notes: str | None, meta: dict):
    visible = (visible_notes or "").rstrip()
    if meta:
        asset.notes = f"{visible}{ASSET_META_MARKER}{json.dumps(meta, separators=(',', ':'))}{ASSET_META_SUFFIX}" if visible else f"{ASSET_META_MARKER}{json.dumps(meta, separators=(',', ':'))}{ASSET_META_SUFFIX}"
    else:
        asset.notes = visible or None


def _serialize_asset(asset: Asset, db: Session) -> dict:
    visible_notes, meta = _split_asset_notes(asset.notes)
    checklist = meta.get("checklist", {})
    documents = db.query(AssetDocument).filter(AssetDocument.asset_id == asset.id).order_by(AssetDocument.uploaded_at.desc()).all()
    repairs = db.query(AssetRepairTicket).filter(AssetRepairTicket.asset_id == asset.id).order_by(AssetRepairTicket.opened_at.desc()).all()
    return {
        "id": asset.id,
        "asset_tag": asset.asset_tag,
        "asset_type": asset.asset_type,
        "brand": asset.brand,
        "model": asset.model,
        "serial_number": asset.serial_number,
        "condition": asset.condition,
        "purchase_date": asset.purchase_date,
        "purchase_cost": asset.purchase_cost,
        "warranty_expiry": asset.warranty_expiry,
        "vendor_name": asset.vendor_name,
        "vendor_invoice_no": asset.vendor_invoice_no,
        "mac_address": asset.mac_address,
        "processor": asset.processor,
        "ram_gb": asset.ram_gb,
        "storage_gb": asset.storage_gb,
        "os_installed": asset.os_installed,
        "location": asset.location,
        "status": asset.status,
        "current_assigned_to": asset.current_assigned_to,
        "notes": visible_notes,
        "created_at": asset.created_at,
        "intake_checklist": checklist,
        "intake_pct": meta.get("intake_pct", 0),
        "documents": [
            {
                "id": doc.id,
                "title": doc.title,
                "category": doc.category,
                "file_path": doc.file_path,
                "file_name": doc.file_name,
                "file_size_kb": doc.file_size_kb,
                "uploaded_by": doc.uploaded_by,
                "uploaded_at": doc.uploaded_at,
            }
            for doc in documents
        ],
        "repair_tickets": [
            {
                "id": ticket.id,
                "ticket_no": ticket.ticket_no,
                "issue_reported": ticket.issue_reported,
                "vendor": ticket.vendor,
                "estimated_cost": ticket.estimated_cost,
                "actual_cost": ticket.actual_cost,
                "repair_status": ticket.repair_status,
                "opened_at": ticket.opened_at,
                "closed_at": ticket.closed_at,
                "resolution": ticket.resolution,
            }
            for ticket in repairs
        ],
    }


def _required_checklist_fields(asset_type: str) -> list[str]:
    fields = [
        "physical_inspect_done",
        "box_contents_verified",
        "serial_number_verified",
        "asset_tag_affixed",
        "invoice_uploaded",
        "warranty_card_uploaded",
        "alloc_form_generated",
        "alloc_form_signed",
        "asset_registered_finance",
    ]
    if asset_type in {"Laptop", "Desktop"}:
        fields.extend([
            "os_installed",
            "domain_joined",
            "antivirus_installed",
            "software_baseline_done",
        ])
    return fields


@router.post("/assets", response_model=AssetOut)
def add_asset(data: AssetCreate, db: Session = Depends(get_db), current_user: User = Depends(require_permission(Permission.ASSET_CREATE))):
    duplicate_filters = [Asset.asset_tag == data.asset_tag]
    if data.serial_number:
        duplicate_filters.append(Asset.serial_number == data.serial_number)

    existing = db.query(Asset).filter(*duplicate_filters).first()
    if existing:
        raise HTTPException(status_code=400, detail="Asset with this tag or serial number already exists")

    asset = Asset(**data.model_dump(), created_by=current_user.id)
    db.add(asset)
    db.flush()
    _add_audit(db, action=f"New asset added: {data.asset_tag} ({data.asset_type})", record_id=asset.id, current_user=current_user)
    db.commit()
    db.refresh(asset)
    return asset


@router.get("/assets", response_model=List[AssetOut])
def list_assets(status: str = None, asset_type: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Asset)
    if status:
        q = q.filter(Asset.status == status)
    if asset_type:
        q = q.filter(Asset.asset_type.ilike(f"%{asset_type}%"))
    return q.order_by(Asset.created_at.desc()).all()


@router.get("/assets/{asset_id}")
def get_asset(asset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    asset = _get_asset_or_404(asset_id, db)
    return _serialize_asset(asset, db)


@router.patch("/assets/{asset_id}/intake")
def update_asset_intake(
    asset_id: int,
    data: AssetIntakeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = _get_asset_or_404(asset_id, db)
    visible_notes, meta = _split_asset_notes(asset.notes)
    checklist = dict(meta.get("checklist", {}))
    payload = data.model_dump(exclude_none=True)

    if "notes" in payload:
        note_prefix = f"[Intake] {payload['notes'].strip()}"
        visible_notes = f"{visible_notes}\n{note_prefix}".strip() if visible_notes else note_prefix

    for key, value in payload.items():
        if key not in {"ready_to_assign", "notes"}:
            checklist[key] = value

    required_fields = _required_checklist_fields(asset.asset_type)
    completed_required = sum(1 for field in required_fields if checklist.get(field))
    intake_pct = round((completed_required / len(required_fields)) * 100) if required_fields else 0
    ready_to_assign = bool(payload.get("ready_to_assign")) or all(checklist.get(field) for field in required_fields)

    checklist["ready_to_assign"] = ready_to_assign
    meta["checklist"] = checklist
    meta["intake_pct"] = intake_pct

    if ready_to_assign and asset.status == AssetStatus.pending:
        asset.status = AssetStatus.available
    elif payload.get("ready_to_assign") is False and asset.status == AssetStatus.available:
        asset.status = AssetStatus.pending

    _write_asset_notes(asset, visible_notes, meta)
    _add_audit(
        db,
        action=f"Asset intake updated for {asset.asset_tag}",
        record_id=asset.id,
        current_user=current_user,
        details=f"ready_to_assign={ready_to_assign}",
    )
    db.commit()
    db.refresh(asset)
    return {
        "success": True,
        "ready_to_assign": ready_to_assign,
        "checklist": checklist,
        "asset": _serialize_asset(asset, db),
    }


@router.post("/assets/{asset_id}/assign", response_model=AssetOut)
def assign_asset(
    asset_id: int,
    data: AssetAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.ASSET_ASSIGN)),
):
    asset = _get_asset_or_404(asset_id, db)
    if asset.status == AssetStatus.assigned:
        raise HTTPException(status_code=400, detail="Asset is already assigned")
    if asset.status == AssetStatus.retired:
        raise HTTPException(status_code=400, detail="Retired assets cannot be assigned")
    if asset.status == AssetStatus.in_repair:
        raise HTTPException(status_code=400, detail="Asset is currently in repair")

    asset.status = AssetStatus.assigned
    asset.current_assigned_to = data.employee_id

    db.add(AssetAssignment(
        asset_id=asset_id,
        employee_id=data.employee_id,
        action="assigned",
        performed_by=data.performed_by,
        performed_by_id=current_user.id,
        reason=data.notes,
    ))
    _add_audit(db, action=f"Asset {asset.asset_tag} assigned to employee ID {data.employee_id}", record_id=asset_id, current_user=current_user)
    db.commit()
    db.refresh(asset)
    return asset


@router.post("/assets/replace", response_model=AssetOut)
def replace_asset(data: AssetReplace, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_asset = _get_asset_or_404(data.new_asset_id, db)
    if new_asset.status not in {AssetStatus.available, AssetStatus.pending}:
        raise HTTPException(status_code=400, detail="Replacement asset must be available")

    old_assignment = db.query(AssetAssignment).filter(
        AssetAssignment.employee_id == data.employee_id,
        AssetAssignment.action == "assigned"
    ).order_by(AssetAssignment.id.desc()).first()

    if old_assignment:
        old_asset = db.query(Asset).filter(Asset.id == old_assignment.asset_id).first()
        if old_asset:
            old_asset.status = AssetStatus.in_repair
            old_asset.current_assigned_to = None
        db.add(AssetAssignment(
            asset_id=old_assignment.asset_id,
            employee_id=data.employee_id,
            action="returned",
            performed_by=data.performed_by,
            performed_by_id=current_user.id,
            reason=f"Replaced: {data.reason}"
        ))

    new_asset.status = AssetStatus.assigned
    new_asset.current_assigned_to = data.employee_id
    db.add(AssetAssignment(
        asset_id=data.new_asset_id,
        employee_id=data.employee_id,
        action="replaced",
        performed_by=data.performed_by,
        performed_by_id=current_user.id,
        reason=data.reason,
        previous_asset_id=old_assignment.asset_id if old_assignment else None
    ))
    _add_audit(db, action=f"Asset replacement for employee ID {data.employee_id}", record_id=data.new_asset_id, current_user=current_user)
    db.commit()
    db.refresh(new_asset)
    return new_asset


@router.post("/assets/{asset_id}/repair/open")
def open_repair_ticket(
    asset_id: int,
    data: RepairTicketOpen,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = _get_asset_or_404(asset_id, db)
    if asset.status == AssetStatus.retired:
        raise HTTPException(status_code=400, detail="Retired assets cannot be sent for repair")
    if asset.status == AssetStatus.in_repair:
        raise HTTPException(status_code=400, detail="Asset is already in repair")

    repair_employee_id = asset.current_assigned_to
    asset.status = AssetStatus.in_repair
    asset.current_assigned_to = None

    ticket_no = f"RPR-{asset.id}-{int(time.time())}"
    reason = data.issue_reported.strip()
    if data.vendor:
        reason = f"{reason} | Vendor: {data.vendor.strip()}"
    if data.estimated_cost:
        reason = f"{reason} | Estimated Cost: {data.estimated_cost.strip()}"

    repair_ticket = AssetRepairTicket(
        asset_id=asset.id,
        ticket_no=ticket_no,
        issue_reported=data.issue_reported.strip(),
        reported_by=current_user.name,
        reported_by_id=current_user.id,
        vendor=data.vendor.strip() if data.vendor else None,
        estimated_cost=data.estimated_cost.strip() if data.estimated_cost else None,
        repair_status="open",
        created_by=current_user.id,
    )
    db.add(repair_ticket)

    if repair_employee_id:
        db.add(AssetAssignment(
            asset_id=asset.id,
            employee_id=repair_employee_id,
            action="repair_out",
            performed_by=current_user.name,
            performed_by_id=current_user.id,
            reason=reason,
        ))
    _add_audit(
        db,
        action=f"Repair opened for asset {asset.asset_tag}",
        record_id=asset.id,
        current_user=current_user,
        details=f"ticket_no={ticket_no}, repair_ticket_saved=true",
    )
    db.commit()
    db.refresh(asset)
    return {"success": True, "ticket_no": ticket_no, "asset_id": asset.id}


@router.patch("/assets/{asset_id}/repair/{ticket_no}/close")
def close_repair_ticket(
    asset_id: int,
    ticket_no: str,
    data: RepairTicketClose,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = _get_asset_or_404(asset_id, db)
    if asset.status != AssetStatus.in_repair:
        raise HTTPException(status_code=400, detail="Asset is not currently in repair")
    if data.repair_status not in {"completed", "scrapped"}:
        raise HTTPException(status_code=400, detail="repair_status must be 'completed' or 'scrapped'")

    repair_ticket = db.query(AssetRepairTicket).filter(
        AssetRepairTicket.asset_id == asset.id,
        AssetRepairTicket.ticket_no == ticket_no
    ).first()
    if not repair_ticket:
        raise HTTPException(status_code=404, detail="Repair ticket not found")

    asset.status = AssetStatus.available if data.repair_status == "completed" else AssetStatus.retired
    repair_ticket.repair_status = data.repair_status
    repair_ticket.resolution = data.resolution.strip()
    repair_ticket.actual_cost = data.actual_cost.strip() if data.actual_cost else None
    repair_ticket.closed_at = datetime.utcnow()

    reason = f"{ticket_no} | {data.resolution.strip()}"
    if data.actual_cost:
        reason = f"{reason} | Actual Cost: {data.actual_cost.strip()}"

    latest_employee_assignment = db.query(AssetAssignment).filter(
        AssetAssignment.asset_id == asset.id,
        AssetAssignment.employee_id.isnot(None)
    ).order_by(AssetAssignment.id.desc()).first()
    if latest_employee_assignment:
        db.add(AssetAssignment(
            asset_id=asset.id,
            employee_id=latest_employee_assignment.employee_id,
            action="repair_in",
            performed_by=current_user.name,
            performed_by_id=current_user.id,
            reason=reason,
        ))
    _add_audit(
        db,
        action=f"Repair closed for asset {asset.asset_tag}",
        record_id=asset.id,
        current_user=current_user,
        details=f"ticket_no={ticket_no}, status={data.repair_status}, repair_ticket_saved=true",
    )
    db.commit()
    db.refresh(asset)
    return {"success": True, "asset_id": asset.id, "status": asset.status}


@router.patch("/assets/{asset_id}/status", response_model=AssetOut)
def transition_asset_status(
    asset_id: int,
    data: AssetStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_permission(
        Permission.ASSET_EDIT,
        Permission.ASSET_MARK_REPAIR,
        Permission.ASSET_RETIRE,
    )),
):
    asset = _get_asset_or_404(asset_id, db)

    try:
        next_status = AssetStatus(data.status)
    except ValueError as exc:
        allowed = ", ".join(status.value for status in AssetStatus)
        raise HTTPException(status_code=400, detail=f"Invalid status. Allowed values: {allowed}") from exc

    if next_status == AssetStatus.retired and not has_permission(current_user, Permission.ASSET_RETIRE):
        raise HTTPException(status_code=403, detail="Permission denied: asset:retire")
    if next_status == AssetStatus.in_repair and not has_permission(current_user, Permission.ASSET_MARK_REPAIR):
        raise HTTPException(status_code=403, detail="Permission denied: asset:mark_repair")
    if next_status == AssetStatus.available and not has_permission(current_user, Permission.ASSET_EDIT):
        raise HTTPException(status_code=403, detail="Permission denied: asset:edit")

    asset.status = next_status
    if next_status != AssetStatus.assigned:
        asset.current_assigned_to = None
    if data.notes:
        note_prefix = f"[Status:{next_status.value}] {data.notes.strip()}"
        asset.notes = f"{asset.notes}\n{note_prefix}".strip() if asset.notes else note_prefix

    _add_audit(
        db,
        action=f"Asset {asset.asset_tag} moved to {next_status.value}",
        record_id=asset.id,
        current_user=current_user,
    )
    db.commit()
    db.refresh(asset)
    return asset


@router.post("/assets/{asset_id}/documents")
async def upload_asset_document(
    asset_id: int,
    file: UploadFile = File(...),
    title: str = Form(""),
    category: str = Form("asset"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DOCUMENT_UPLOAD)),
):
    asset = _get_asset_or_404(asset_id, db)

    filename = file.filename or "upload"
    safe_filename = f"{int(time.time())}_{filename.replace(' ', '_')}"
    asset_dir = Path(settings.UPLOAD_DIR) / "assets" / str(asset.id)
    os.makedirs(asset_dir, exist_ok=True)
    file_path = asset_dir / safe_filename

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    display_title = title.strip() or filename
    file_size_kb = round(len(content) / 1024)

    document = AssetDocument(
        asset_id=asset.id,
        title=display_title,
        category=category,
        file_path=str(file_path),
        file_name=filename,
        file_size_kb=file_size_kb,
        uploaded_by=current_user.name,
        uploaded_by_id=current_user.id,
    )
    db.add(document)
    details = f"title={display_title}, category={category}, path={file_path.name}"
    _add_audit(
        db,
        action=f"Document uploaded for asset {asset.asset_tag}",
        record_id=asset.id,
        current_user=current_user,
        details=details,
    )
    db.commit()
    return {
        "success": True,
        "asset_id": asset.id,
        "title": display_title,
        "category": category,
        "file_name": filename,
        "file_path": str(file_path),
        "file_size_kb": file_size_kb,
    }


@router.get("/assets/{asset_id}/documents")
def list_asset_documents(asset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_asset_or_404(asset_id, db)
    documents = db.query(AssetDocument).filter(AssetDocument.asset_id == asset_id).order_by(AssetDocument.uploaded_at.desc()).all()
    return [
        {
            "id": doc.id,
            "title": doc.title,
            "category": doc.category,
            "file_path": doc.file_path,
            "file_name": doc.file_name,
            "file_size_kb": doc.file_size_kb,
            "uploaded_by": doc.uploaded_by,
            "uploaded_at": doc.uploaded_at,
        }
        for doc in documents
    ]


@router.delete("/assets/{asset_id}/documents/{document_id}")
def delete_asset_document(
    asset_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DOCUMENT_DELETE)),
):
    asset = _get_asset_or_404(asset_id, db)
    document = db.query(AssetDocument).filter(
        AssetDocument.id == document_id,
        AssetDocument.asset_id == asset_id,
    ).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = document.file_path
    db.delete(document)
    _add_audit(
        db,
        action=f"Document deleted for asset {asset.asset_tag}",
        record_id=asset.id,
        current_user=current_user,
        details=f"document_id={document_id}, file_name={document.file_name}",
    )
    db.commit()

    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass

    return {"success": True, "asset_id": asset.id, "document_id": document_id}


@router.get("/assets/{asset_id}/history", response_model=List[AssetAssignmentOut])
def asset_history(asset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(AssetAssignment).filter(AssetAssignment.asset_id == asset_id).order_by(AssetAssignment.action_date.desc()).all()

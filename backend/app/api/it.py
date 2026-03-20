from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import Asset, AssetAssignment, AssetStatus, AuditLog, User
from app.models.schemas import AssetCreate, AssetOut, AssetAssign, AssetReplace, AssetAssignmentOut

router = APIRouter(prefix="/api/it", tags=["IT Assets"])


@router.post("/assets", response_model=AssetOut)
def add_asset(data: AssetCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Asset).filter(
        (Asset.asset_tag == data.asset_tag) | (Asset.serial_number == data.serial_number)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Asset with this tag or serial number already exists")

    asset = Asset(**data.model_dump(), created_by=current_user.id)
    db.add(asset)
    db.flush()
    db.add(AuditLog(action=f"New asset added: {data.asset_tag} ({data.asset_type})", module="IT", record_id=asset.id, performed_by=current_user.id))
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


@router.get("/assets/{asset_id}", response_model=AssetOut)
def get_asset(asset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.post("/assets/{asset_id}/assign", response_model=AssetOut)
def assign_asset(asset_id: int, data: AssetAssign, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if asset.status == AssetStatus.assigned:
        raise HTTPException(status_code=400, detail="Asset is already assigned")

    asset.status = AssetStatus.assigned
    asset.current_assigned_to = data.employee_id

    db.add(AssetAssignment(
        asset_id=asset_id,
        employee_id=data.employee_id,
        action="assigned",
        performed_by=data.performed_by,
        reason=data.notes
    ))
    db.add(AuditLog(action=f"Asset {asset.asset_tag} assigned to employee ID {data.employee_id}", module="IT", record_id=asset_id, performed_by=current_user.id))
    db.commit()
    db.refresh(asset)
    return asset


@router.post("/assets/replace", response_model=AssetOut)
def replace_asset(data: AssetReplace, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_asset = db.query(Asset).filter(Asset.id == data.new_asset_id).first()
    if not new_asset:
        raise HTTPException(status_code=404, detail="New asset not found")

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
            reason=f"Replaced: {data.reason}"
        ))

    new_asset.status = AssetStatus.assigned
    new_asset.current_assigned_to = data.employee_id
    db.add(AssetAssignment(
        asset_id=data.new_asset_id,
        employee_id=data.employee_id,
        action="replaced",
        performed_by=data.performed_by,
        reason=data.reason,
        previous_asset_id=old_assignment.asset_id if old_assignment else None
    ))
    db.add(AuditLog(action=f"Asset replacement for employee ID {data.employee_id}", module="IT", record_id=data.new_asset_id, performed_by=current_user.id))
    db.commit()
    db.refresh(new_asset)
    return new_asset


@router.get("/assets/{asset_id}/history", response_model=List[AssetAssignmentOut])
def asset_history(asset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(AssetAssignment).filter(AssetAssignment.asset_id == asset_id).order_by(AssetAssignment.action_date.desc()).all()

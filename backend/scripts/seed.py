"""
One-time bootstrap seed for the current codebase.
Creates tables, default users, and a few sample assets.
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.auth import get_password_hash
from app.core.database import SessionLocal, create_tables
from app.models.models import Asset, AssetStatus, User, UserRole


def build_asset_notes(intake_pct: int = 0, ready_to_assign: bool = False) -> str:
    meta = {
        "checklist": {"ready_to_assign": ready_to_assign},
        "intake_pct": intake_pct,
    }
    return f"<!--ASSET_META:{json.dumps(meta, separators=(',', ':'))}-->"


def seed_users(db):
    users = [
        {"name": "Admin User", "email": "admin@company.com", "password": "admin123", "role": UserRole.admin},
        {"name": "HR Manager", "email": "hr@company.com", "password": "hr123", "role": UserRole.hr},
        {"name": "IT Manager", "email": "it@company.com", "password": "it123", "role": UserRole.it},
        {"name": "Finance Lead", "email": "finance@company.com", "password": "finance123", "role": UserRole.finance},
        {"name": "Admin Dept", "email": "admindept@company.com", "password": "admin123", "role": UserRole.admin_dept},
        {"name": "Auditor", "email": "auditor@company.com", "password": "audit123", "role": UserRole.auditor},
    ]
    created = 0
    for item in users:
        if not db.query(User).filter(User.email == item["email"]).first():
            db.add(User(
                name=item["name"],
                email=item["email"],
                hashed_password=get_password_hash(item["password"]),
                role=item["role"],
            ))
            created += 1
    db.commit()
    return created


def seed_assets(db):
    admin = db.query(User).filter(User.role == UserRole.admin).first()
    if not admin:
        return 0

    assets = [
        {
            "asset_tag": "LAP-2024-001",
            "asset_type": "Laptop",
            "brand": "Dell",
            "model": "Latitude 5540",
            "serial_number": "SN-DELL-001",
            "status": AssetStatus.pending,
            "notes": build_asset_notes(35, False),
        },
        {
            "asset_tag": "LAP-2024-002",
            "asset_type": "Laptop",
            "brand": "HP",
            "model": "EliteBook 840",
            "serial_number": "SN-HP-002",
            "status": AssetStatus.available,
            "notes": build_asset_notes(100, True),
        },
        {
            "asset_tag": "MON-2024-001",
            "asset_type": "Monitor",
            "brand": "Dell",
            "model": "U2722D",
            "serial_number": "SN-DELL-M001",
            "status": AssetStatus.available,
            "notes": build_asset_notes(100, True),
        },
    ]

    created = 0
    for item in assets:
        if not db.query(Asset).filter(Asset.asset_tag == item["asset_tag"]).first():
            db.add(Asset(created_by=admin.id, **item))
            created += 1
    db.commit()
    return created


def main():
    print("Creating tables...")
    create_tables()

    db = SessionLocal()
    try:
        user_count = seed_users(db)
        asset_count = seed_assets(db)
        print(f"Seeded users: {user_count}")
        print(f"Seeded assets: {asset_count}")
        print("Default admin: admin@company.com / admin123")
    finally:
        db.close()


if __name__ == "__main__":
    main()

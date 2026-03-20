"""
Run this script ONCE after first startup to create the default admin user.
Usage: python scripts/seed_admin.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, create_tables
from app.core.auth import get_password_hash
from app.models.models import User, UserRole


def seed():
    create_tables()
    db = SessionLocal()
    try:
        users_to_create = [
            {"name": "Admin User",    "email": "admin@company.com",   "password": "admin123",  "role": UserRole.admin},
            {"name": "HR Manager",    "email": "hr@company.com",      "password": "hr123",     "role": UserRole.hr},
            {"name": "IT Manager",    "email": "it@company.com",      "password": "it123",     "role": UserRole.it},
            {"name": "Auditor",       "email": "audit@company.com",   "password": "audit123",  "role": UserRole.auditor},
        ]
        for u in users_to_create:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                user = User(
                    name=u["name"],
                    email=u["email"],
                    hashed_password=get_password_hash(u["password"]),
                    role=u["role"]
                )
                db.add(user)
                print(f"  ✅ Created user: {u['email']} (role: {u['role']})")
            else:
                print(f"  ℹ️  User already exists: {u['email']}")
        db.commit()
        print("\n✅ Seed complete.")
        print("\nLogin credentials:")
        print("  Admin:   admin@company.com   / admin123")
        print("  HR:      hr@company.com      / hr123")
        print("  IT:      it@company.com      / it123")
        print("  Auditor: audit@company.com   / audit123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()

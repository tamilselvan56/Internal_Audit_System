# type: ignore
"""
Seed dummy employees, assets, and assignments into the database.
Usage: python scripts/seed_dummy_data.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from app.core.database import SessionLocal, create_tables
from app.models.models import (
    Employee, EmployeeStatus, OnboardingStep, RelievingStep,
    Asset, AssetStatus, AssetAssignment, AuditLog
)

# ── Onboarding template (must match hr.py) ───────────────────────────────────
HR_STEPS = [
    ("Buddy Allocation", "HR"), ("Floorwalk", "HR"), ("Office Space Allocation", "HR"),
    ("Laptop/Desktop Allocation", "HR"), ("Paper work", "HR"), ("NDA", "HR"),
    ("Appointment Letter Generation", "HR"), ("Email ID", "HR"), ("Teams", "HR"),
    ("Induction Mail", "HR"), ("Employee ID updated in HRMS", "HR"),
    ("Date of Birth as per proofs submitted updated in HRMS", "HR"),
    ("Employee Contact Number updated in HRMS", "HR"),
    ("Emergency Contact Number updated in HRMS", "HR"), ("Blood Group in HRMS", "HR"),
    ("Buddy + RM introduction", "HR"), ("Welcome Mailer", "HR"),
    ("HRMS Account creation", "HR"), ("Leaves Uploaded in HRMS", "HR"),
    ("Credentials shared with resource", "HR"),
    ("Birthday + Anniversary + Photo in HRMS", "HR"), ("Leaves Tracker Updated", "HR"),
    ("Unit Head Orientation session", "HR"), ("L1 Orientation", "HR"), ("BGV", "HR"),
]
FINANCE_STEPS = [
    ("Appointment Letter", "Finance"), ("KYC Update", "Finance"),
    ("Medical Insurance", "Finance"), ("IT Declaration", "Finance"),
    ("HDFC Salary Account", "Finance"),
]
ADMIN_STEPS = [
    ("Logistics Feedback from Employees", "Admin"), ("Office space allocation", "Admin"),
    ("Biometric registration", "Admin"), ("Id card - Soft copy", "Admin"),
    ("Employee details", "Admin"), ("Doodle book for DC", "Admin"),
    ("Gramener Bag", "Admin"), ("Welcome Kit (Dispatched/In-transit/Received)", "Admin"),
    ("Covid Insurance", "Admin"),
]
IT_STEPS = [
    ("Email", "IT"), ("DL (Distribution List)", "IT"), ("O365", "IT"),
    ("SharePoint", "IT"), ("PC/Laptop", "IT"), ("Laptop Ship/Receive dates", "IT"),
    ("IT Asset Allocation Form", "IT"), ("Data card", "IT"), ("Other Assets", "IT"),
    ("WiKi (Digital)", "IT"), ("Kaspersky/Sophos", "IT"), ("Domain policies", "IT"),
    ("Onboarding Email", "IT"),
]
ALL_ONBOARDING = HR_STEPS + FINANCE_STEPS + ADMIN_STEPS + IT_STEPS

RELIEVING_STEPS = [
    ("Confirm LWD from Reporting Manager (within 2 weeks of resignation)", "HR"),
    ("Send exit mail to support@company.com (1 week before LWD)", "HR"),
    ("Collect Aadhaar card copy with address and personal Gmail from employee", "HR"),
    ("Share NDA with employee and obtain signed copy on or before LWD", "HR"),
    ("Issue Relieving Letter to employee's personal email", "HR"),
    ("Issue Service Letter to employee's personal email", "HR"),
    ("Create FnF sheet with basic details and share with HR", "HR"),
    ("Update off-boarding tracker with all necessary details", "HR"),
    ("Coordinate with employee for laptop return", "IT"),
    ("Deactivate Email ID credentials", "IT"),
    ("Update Laptop details in S&H tracker", "IT"),
    ("Revoke O365 / SharePoint / Domain access", "IT"),
    ("Revoke all system and tool access", "IT"),
    ("Collect ID card from employee", "Admin"),
    ("Collect access card from employee", "Admin"),
    ("Settle pending expense claims", "Finance"),
    ("Process Final & Full settlement (FnF)", "Finance"),
    ("Issue No Dues Certificate", "Finance"),
]

# ── Dummy employees ───────────────────────────────────────────────────────────
EMPLOYEES = [
    {
        "employee_id": "EMP-001",
        "full_name": "Arjun Sharma",
        "email": "arjun.sharma@company.com",
        "personal_email": "arjun.sharma@gmail.com",
        "department": "Engineering",
        "designation": "Senior Software Engineer",
        "manager_name": "Priya Menon",
        "phone": "+91 98765 43210",
        "emergency_contact": "+91 98765 00001",
        "group_company": "Gramener",
        "partner_company": "",
        "location": "Hyderabad",
        "blood_group": "O+",
        "join_date": datetime(2024, 1, 15),
        "status": EmployeeStatus.active,
        "completed_steps": 40,   # out of 52 total
    },
    {
        "employee_id": "EMP-002",
        "full_name": "Priya Nair",
        "email": "priya.nair@company.com",
        "personal_email": "priya.nair@gmail.com",
        "department": "HR",
        "designation": "HR Manager",
        "manager_name": "Sonal Gupta",
        "phone": "+91 87654 32109",
        "emergency_contact": "+91 87654 00002",
        "group_company": "Gramener",
        "partner_company": "",
        "location": "Bangalore",
        "blood_group": "A+",
        "join_date": datetime(2023, 6, 1),
        "status": EmployeeStatus.active,
        "completed_steps": 52,   # fully onboarded
    },
    {
        "employee_id": "EMP-003",
        "full_name": "Ravi Kumar",
        "email": "ravi.kumar@company.com",
        "personal_email": "ravi.kumar@gmail.com",
        "department": "Finance",
        "designation": "Finance Analyst",
        "manager_name": "Deepak Verma",
        "phone": "+91 76543 21098",
        "emergency_contact": "+91 76543 00003",
        "group_company": "Gramener",
        "partner_company": "Partner Co Ltd",
        "location": "Mumbai",
        "blood_group": "B+",
        "join_date": datetime(2024, 3, 10),
        "status": EmployeeStatus.active,
        "completed_steps": 20,
    },
    {
        "employee_id": "EMP-004",
        "full_name": "Sneha Reddy",
        "email": "sneha.reddy@company.com",
        "personal_email": "sneha.reddy@gmail.com",
        "department": "IT",
        "designation": "IT Support Engineer",
        "manager_name": "Anitha Krishnan",
        "phone": "+91 65432 10987",
        "emergency_contact": "+91 65432 00004",
        "group_company": "Gramener",
        "partner_company": "",
        "location": "Hyderabad",
        "blood_group": "AB+",
        "join_date": datetime(2023, 11, 20),
        "status": EmployeeStatus.active,
        "completed_steps": 52,
    },
    {
        "employee_id": "EMP-005",
        "full_name": "Amit Patel",
        "email": "amit.patel@company.com",
        "personal_email": "amit.patel@gmail.com",
        "department": "Sales",
        "designation": "Sales Executive",
        "manager_name": "Ramesh Iyer",
        "phone": "+91 54321 09876",
        "emergency_contact": "+91 54321 00005",
        "group_company": "Gramener",
        "partner_company": "Sales Partner Inc",
        "location": "Chennai",
        "blood_group": "O-",
        "join_date": datetime(2024, 2, 5),
        "status": EmployeeStatus.active,
        "completed_steps": 10,
    },
    {
        "employee_id": "EMP-006",
        "full_name": "Meera Joshi",
        "email": "meera.joshi@company.com",
        "personal_email": "meera.joshi@gmail.com",
        "department": "Marketing",
        "designation": "Marketing Lead",
        "manager_name": "Priya Nair",
        "phone": "+91 43210 98765",
        "emergency_contact": "+91 43210 00006",
        "group_company": "Gramener",
        "partner_company": "",
        "location": "Pune",
        "blood_group": "A-",
        "join_date": datetime(2022, 8, 15),
        "relieve_date": datetime(2024, 8, 15),
        "status": EmployeeStatus.relieved,
        "completed_steps": 52,
        "relieving_completed": 12,  # partially done relieving
    },
    {
        "employee_id": "EMP-007",
        "full_name": "Kiran Desai",
        "email": "kiran.desai@company.com",
        "personal_email": "kiran.desai@gmail.com",
        "department": "Engineering",
        "designation": "DevOps Engineer",
        "manager_name": "Arjun Sharma",
        "phone": "+91 32109 87654",
        "emergency_contact": "+91 32109 00007",
        "group_company": "Gramener",
        "partner_company": "",
        "location": "Hyderabad",
        "blood_group": "B-",
        "join_date": datetime(2024, 5, 20),
        "status": EmployeeStatus.active,
        "completed_steps": 30,
    },
    {
        "employee_id": "EMP-008",
        "full_name": "Divya Menon",
        "email": "divya.menon@company.com",
        "personal_email": "divya.menon@gmail.com",
        "department": "Operations",
        "designation": "Operations Manager",
        "manager_name": "Sonal Gupta",
        "phone": "+91 21098 76543",
        "emergency_contact": "+91 21098 00008",
        "group_company": "Gramener",
        "partner_company": "Ops Partner Pvt",
        "location": "Delhi",
        "blood_group": "O+",
        "join_date": datetime(2023, 3, 1),
        "status": EmployeeStatus.active,
        "completed_steps": 52,
    },
]

# ── Dummy assets ──────────────────────────────────────────────────────────────
ASSETS = [
    {"asset_tag": "LAP-2024-001", "asset_type": "Laptop", "brand": "Dell", "model": "Latitude 5540", "serial_number": "SN-DELL-001", "purchase_date": datetime(2024, 1, 1), "warranty_expiry": datetime(2027, 1, 1), "status": AssetStatus.assigned},
    {"asset_tag": "LAP-2024-002", "asset_type": "Laptop", "brand": "HP", "model": "EliteBook 840", "serial_number": "SN-HP-002", "purchase_date": datetime(2024, 1, 1), "warranty_expiry": datetime(2027, 1, 1), "status": AssetStatus.assigned},
    {"asset_tag": "LAP-2024-003", "asset_type": "Laptop", "brand": "Lenovo", "model": "ThinkPad X1", "serial_number": "SN-LEN-003", "purchase_date": datetime(2024, 2, 1), "warranty_expiry": datetime(2027, 2, 1), "status": AssetStatus.assigned},
    {"asset_tag": "LAP-2024-004", "asset_type": "Laptop", "brand": "Dell", "model": "Inspiron 15", "serial_number": "SN-DELL-004", "purchase_date": datetime(2024, 2, 1), "warranty_expiry": datetime(2027, 2, 1), "status": AssetStatus.assigned},
    {"asset_tag": "LAP-2024-005", "asset_type": "Laptop", "brand": "Apple", "model": "MacBook Pro M3", "serial_number": "SN-APL-005", "purchase_date": datetime(2024, 3, 1), "warranty_expiry": datetime(2027, 3, 1), "status": AssetStatus.available},
    {"asset_tag": "LAP-2024-006", "asset_type": "Laptop", "brand": "HP", "model": "ProBook 450", "serial_number": "SN-HP-006", "purchase_date": datetime(2024, 3, 1), "warranty_expiry": datetime(2027, 3, 1), "status": AssetStatus.available},
    {"asset_tag": "LAP-2024-007", "asset_type": "Laptop", "brand": "Lenovo", "model": "IdeaPad 3", "serial_number": "SN-LEN-007", "purchase_date": datetime(2023, 6, 1), "warranty_expiry": datetime(2026, 6, 1), "status": AssetStatus.in_repair},
    {"asset_tag": "MON-2024-001", "asset_type": "Monitor", "brand": "LG", "model": "27UK850", "serial_number": "SN-LG-M001", "purchase_date": datetime(2024, 1, 1), "warranty_expiry": datetime(2027, 1, 1), "status": AssetStatus.assigned},
    {"asset_tag": "MON-2024-002", "asset_type": "Monitor", "brand": "Dell", "model": "U2722D", "serial_number": "SN-DELL-M002", "purchase_date": datetime(2024, 1, 1), "warranty_expiry": datetime(2027, 1, 1), "status": AssetStatus.available},
    {"asset_tag": "PHN-2024-001", "asset_type": "Mobile", "brand": "Samsung", "model": "Galaxy S23", "serial_number": "SN-SAM-P001", "purchase_date": datetime(2024, 4, 1), "warranty_expiry": datetime(2026, 4, 1), "status": AssetStatus.assigned},
    {"asset_tag": "HST-2024-001", "asset_type": "Headset", "brand": "Jabra", "model": "Evolve2 65", "serial_number": "SN-JAB-H001", "purchase_date": datetime(2024, 1, 1), "warranty_expiry": datetime(2026, 1, 1), "status": AssetStatus.assigned},
    {"asset_tag": "LAP-2023-001", "asset_type": "Laptop", "brand": "Dell", "model": "Latitude 5530", "serial_number": "SN-DELL-OLD-001", "purchase_date": datetime(2023, 1, 1), "warranty_expiry": datetime(2026, 1, 1), "status": AssetStatus.retired},
]


def seed():
    create_tables()
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(Employee).count() > 0:
            print("⚠️  Employees already exist. Skipping seed to avoid duplicates.")
            print("   To re-seed, manually delete the data first.")
            return

        print("🌱 Seeding dummy employees...")
        created_employees = []

        for emp_data in EMPLOYEES:
            completed_steps = emp_data.pop("completed_steps", 0)
            relieving_completed = emp_data.pop("relieving_completed", 0)

            emp = Employee(
                created_by=1,  # admin user id
                **{k: v for k, v in emp_data.items() if k != "relieve_date" or emp_data.get("relieve_date")}
            )
            # handle optional relieve_date
            if "relieve_date" in emp_data:
                emp.relieve_date = emp_data["relieve_date"]

            db.add(emp)
            db.flush()

            # Add onboarding steps
            for i, (step_name, category) in enumerate(ALL_ONBOARDING):
                is_done = i < completed_steps
                step = OnboardingStep(
                    employee_id=emp.id,
                    step_name=step_name,
                    step_category=category,
                    is_completed=is_done,
                    completed_by="Admin User" if is_done else None,
                    completed_at=datetime.utcnow() - timedelta(days=30 - i) if is_done else None,
                )
                db.add(step)

            # Add relieving steps if relieved
            if emp.status == EmployeeStatus.relieved:
                for i, (step_name, category) in enumerate(RELIEVING_STEPS):
                    is_done = i < relieving_completed
                    step = RelievingStep(
                        employee_id=emp.id,
                        step_name=step_name,
                        step_category=category,
                        is_completed=is_done,
                        completed_by="Admin User" if is_done else None,
                        completed_at=datetime.utcnow() - timedelta(days=10 - i) if is_done else None,
                    )
                    db.add(step)

            created_employees.append(emp)
            print(f"   ✅ {emp.employee_id} — {emp.full_name} ({emp.status})")

        db.flush()

        print("\n🌱 Seeding dummy assets...")
        # Employees to assign assets to (active ones)
        active_emps = [e for e in created_employees if e.status == EmployeeStatus.active]
        assigned_count = 0

        for asset_data in ASSETS:
            asset = Asset(created_by=1, **asset_data)
            db.add(asset)
            db.flush()

            # Assign the first few assets to active employees
            if asset.status == AssetStatus.assigned and assigned_count < len(active_emps):
                emp = active_emps[assigned_count]
                asset.current_assigned_to = emp.id
                db.add(AssetAssignment(
                    asset_id=asset.id,
                    employee_id=emp.id,
                    action="assigned",
                    performed_by="IT Manager",
                    reason="Initial allocation on joining"
                ))
                assigned_count += 1

            print(f"   ✅ {asset.asset_tag} — {asset.brand} {asset.model} ({asset.status})")

        db.add(AuditLog(
            action="Dummy data seeded for demo",
            module="System",
            record_id=None,
            performed_by=1
        ))

        db.commit()
        print("\n✅ Dummy data seeded successfully!")
        print(f"   👥 {len(EMPLOYEES)} employees created")
        print(f"   💻 {len(ASSETS)} assets created")
        print(f"   📋 Onboarding checklists: {len(ALL_ONBOARDING)} steps per employee")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
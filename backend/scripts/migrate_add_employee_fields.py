"""
Run this script ONCE to add new columns to the existing database.
Usage: python scripts/migrate_add_employee_fields.py

This is a safe, additive migration - existing data is NOT affected.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text

from app.core.database import engine


NEW_EMPLOYEE_COLUMNS = [
    ("group_company", "VARCHAR(150)"),
    ("partner_company", "VARCHAR(150)"),
    ("location", "VARCHAR(100)"),
    ("date_of_birth", "TIMESTAMP WITH TIME ZONE"),
    ("blood_group", "VARCHAR(10)"),
    ("emergency_contact", "VARCHAR(20)"),
    ("personal_email", "VARCHAR(150)"),
    ("aadhaar_number", "VARCHAR(20)"),
    ("comments", "TEXT"),
]


def column_exists(conn, table: str, column: str) -> bool:
    result = conn.execute(
        text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = :t AND column_name = :c"
        ),
        {"t": table, "c": column},
    )
    return result.fetchone() is not None


def migrate():
    with engine.connect() as conn:
        print("Migrating employees table...")
        for col_name, col_type in NEW_EMPLOYEE_COLUMNS:
            if column_exists(conn, "employees", col_name):
                print(f"   Column already exists: employees.{col_name}")
            else:
                conn.execute(text(f"ALTER TABLE employees ADD COLUMN {col_name} {col_type}"))
                print(f"   Added: employees.{col_name} ({col_type})")

        conn.commit()

    print("\nMigration complete. No existing data was modified.")


if __name__ == "__main__":
    migrate()

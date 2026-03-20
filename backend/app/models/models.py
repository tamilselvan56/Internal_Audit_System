from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


def enum_column(enum_cls: type[enum.Enum], name: str):
    return Enum(
        enum_cls,
        name=name,
        native_enum=False,
        validate_strings=True,
        create_constraint=True,
    )


class UserRole(str, enum.Enum):
    admin = "admin"
    hr = "hr"
    it = "it"
    finance = "finance"
    admin_dept = "admin_dept"   # Admin/HR department role
    auditor = "auditor"


class AssetStatus(str, enum.Enum):
    available = "available"
    assigned = "assigned"
    in_repair = "in_repair"
    retired = "retired"


class EmployeeStatus(str, enum.Enum):
    active = "active"
    relieved = "relieved"
    on_leave = "on_leave"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(enum_column(UserRole, "userrole"), default=UserRole.hr)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(20), unique=True, index=True, nullable=False)
    full_name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    department = Column(String(100), nullable=False)
    designation = Column(String(100), nullable=False)
    manager_name = Column(String(150))
    phone = Column(String(20))

    # New fields per client requirement
    group_company = Column(String(150), nullable=True)
    partner_company = Column(String(150), nullable=True)
    location = Column(String(100), nullable=True)
    date_of_birth = Column(DateTime(timezone=True), nullable=True)
    blood_group = Column(String(10), nullable=True)
    emergency_contact = Column(String(20), nullable=True)
    personal_email = Column(String(150), nullable=True)
    aadhaar_number = Column(String(20), nullable=True)

    status = Column(enum_column(EmployeeStatus, "employeestatus"), default=EmployeeStatus.active)
    join_date = Column(DateTime(timezone=True))
    relieve_date = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # SLA tracking
    sla_met = Column(String(10), nullable=True)   # "Yes" / "No" / null
    comments = Column(Text, nullable=True)

    onboarding_steps = relationship("OnboardingStep", back_populates="employee", cascade="all, delete-orphan")
    relieving_steps = relationship("RelievingStep", back_populates="employee", cascade="all, delete-orphan")
    asset_assignments = relationship("AssetAssignment", back_populates="employee")


class OnboardingStep(Base):
    __tablename__ = "onboarding_steps"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    step_name = Column(String(200), nullable=False)
    step_category = Column(String(100))   # HR | Finance | Admin | IT
    is_completed = Column(Boolean, default=False)
    completed_by = Column(String(150))
    completed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    sla_met = Column(String(10), nullable=True)   # "Yes" / "No"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    employee = relationship("Employee", back_populates="onboarding_steps")


class RelievingStep(Base):
    __tablename__ = "relieving_steps"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    step_name = Column(String(200), nullable=False)
    step_category = Column(String(100))   # HR | IT | Admin | Finance
    is_completed = Column(Boolean, default=False)
    completed_by = Column(String(150))
    completed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    sla_met = Column(String(10), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    employee = relationship("Employee", back_populates="relieving_steps")


class Asset(Base):
    __tablename__ = "assets"
    id = Column(Integer, primary_key=True, index=True)
    asset_tag = Column(String(50), unique=True, index=True, nullable=False)
    asset_type = Column(String(100), nullable=False)
    brand = Column(String(100))
    model = Column(String(150))
    serial_number = Column(String(100), unique=True)
    purchase_date = Column(DateTime(timezone=True), nullable=True)
    warranty_expiry = Column(DateTime(timezone=True), nullable=True)
    status = Column(enum_column(AssetStatus, "assetstatus"), default=AssetStatus.available)
    current_assigned_to = Column(Integer, ForeignKey("employees.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    assignments = relationship("AssetAssignment", back_populates="asset", foreign_keys="AssetAssignment.asset_id")


class AssetAssignment(Base):
    __tablename__ = "asset_assignments"
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    action = Column(String(50), nullable=False)  # assigned, returned, replaced
    action_date = Column(DateTime(timezone=True), server_default=func.now())
    performed_by = Column(String(150))
    reason = Column(Text, nullable=True)
    previous_asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)

    asset = relationship("Asset", foreign_keys=[asset_id], back_populates="assignments")
    employee = relationship("Employee", back_populates="asset_assignments")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(200), nullable=False)
    module = Column(String(50), nullable=False)
    record_id = Column(Integer, nullable=True)
    performed_by = Column(Integer, ForeignKey("users.id"))
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
